// --- STRIPE SUBSCRIPTION MANAGEMENT ---
// Replace with your real Stripe publishable key when ready
const STRIPE_CONFIG = {
  // Test mode key — replace with your real pk_live_ key for production
  publishableKey: 'pk_test_REPLACE_WITH_YOUR_KEY',
  // Price ID from Stripe Dashboard (create a product first)
  priceId: 'price_REPLACE_WITH_YOUR_PRICE_ID',
  // URLs
  successUrl: window.location.origin + '/mysite/index.html?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: window.location.origin + '/mysite/index.html?canceled=true'
};

// Subscription states
const SUB_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  NONE: 'none'
};

const TRIAL_DAYS = 14;

// --- Subscription Check ---
async function getSubscriptionStatus() {
  const subData = await dbGet('subscription');
  if (!subData) {
    // First time user — start trial
    const trialStart = new Date().toISOString();
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
    await dbSet('subscription', { status: 'trial', trialStart, trialEnd });
    return { status: SUB_STATUS.TRIAL, daysLeft: TRIAL_DAYS };
  }

  if (subData.status === 'active') {
    return { status: SUB_STATUS.ACTIVE };
  }

  if (subData.status === 'trial') {
    const trialEnd = new Date(subData.trialEnd);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd - now) / 86400000);
    if (daysLeft > 0) {
      return { status: SUB_STATUS.TRIAL, daysLeft };
    } else {
      return { status: SUB_STATUS.EXPIRED };
    }
  }

  return { status: SUB_STATUS.EXPIRED };
}

// --- Paywall UI ---
function showPaywall() {
  document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
      <div style="max-width:420px;text-align:center;background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:40px">
        <h2 style="margin-bottom:10px">🔒 Trial Expired</h2>
        <p style="color:#888;margin-bottom:24px">Your 14-day free trial has ended. Subscribe to continue using Life OS.</p>
        <div style="background:#111;border:1px solid #333;border-radius:12px;padding:20px;margin-bottom:24px">
          <div style="font-size:32px;font-weight:700;color:#ff6b6b">$7<span style="font-size:14px;color:#888">/month</span></div>
          <div style="font-size:13px;color:#888;margin-top:6px">All features · Unlimited data · Cancel anytime</div>
        </div>
        <button onclick="startCheckout()" style="width:100%;padding:14px;background:#ff6b6b;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer">Subscribe Now</button>
        <p style="font-size:12px;color:#555;margin-top:14px">Powered by Stripe · Secure payment</p>
        <button onclick="signOut()" style="margin-top:12px;background:none;border:1px solid #333;color:#888;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px">Sign out</button>
      </div>
    </div>
  `;
}

function showTrialBanner(daysLeft) {
  const existing = document.getElementById('trial-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'trial-banner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a1a1a;border-top:1px solid #333;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;z-index:100;font-size:13px';
  banner.innerHTML = `
    <span>⏰ Trial: <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> remaining</span>
    <button onclick="startCheckout()" style="background:#ff6b6b;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">Subscribe $7/mo</button>
  `;
  document.body.appendChild(banner);
}

// --- Stripe Checkout ---
async function startCheckout() {
  if (STRIPE_CONFIG.publishableKey.includes('REPLACE')) {
    alert('Stripe is not configured yet. Replace the publishableKey and priceId in stripe.js with your real Stripe credentials.');
    return;
  }
  const stripe = Stripe(STRIPE_CONFIG.publishableKey);
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: STRIPE_CONFIG.priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: STRIPE_CONFIG.successUrl,
    cancelUrl: STRIPE_CONFIG.cancelUrl,
    clientReferenceId: auth.currentUser.uid
  });
  if (error) alert('Payment error: ' + error.message);
}

// --- Handle return from Stripe ---
async function handleStripeReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('session_id')) {
    // Payment successful — mark as active
    await dbSet('subscription', { status: 'active', subscribedAt: new Date().toISOString() });
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    return true;
  }
  if (params.get('canceled')) {
    window.history.replaceState({}, '', window.location.pathname);
  }
  return false;
}

// --- Manage Subscription (cancel) ---
function showManageSubscription() {
  // Add a "Manage Subscription" link in the user bar
  const userBar = document.querySelector('.user-bar');
  if (userBar && !document.getElementById('manage-sub-btn')) {
    const btn = document.createElement('button');
    btn.id = 'manage-sub-btn';
    btn.textContent = 'Manage Plan';
    btn.style.cssText = 'font-size:12px;background:none;border:1px solid #333;color:#888;padding:4px 10px;border-radius:6px;cursor:pointer;margin-right:8px';
    btn.onclick = () => {
      if (STRIPE_CONFIG.publishableKey.includes('REPLACE')) {
        alert('Stripe not configured. In production, this opens the Stripe Customer Portal.');
      } else {
        // In production, redirect to Stripe Customer Portal
        window.open('https://billing.stripe.com/p/login/REPLACE', '_blank');
      }
    };
    userBar.insertBefore(btn, userBar.firstChild);
  }
}
