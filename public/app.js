// DOM Elements
const perTripEl = document.getElementById('perTrip');
const remainingBudgetEl = document.getElementById('remainingBudget');
const remainingTripsEl = document.getElementById('remainingTrips');
const lastUpdatedEl = document.getElementById('lastUpdated');
const newBudgetInput = document.getElementById('newBudget');
const updateBtn = document.getElementById('updateBtn');
const resetBtn = document.getElementById('resetBtn');

// Toast notification
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Format currency
function formatCurrency(amount) {
  return amount.toFixed(2);
}

// Format date
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Update UI with budget data
function updateUI(data) {
  perTripEl.textContent = formatCurrency(data.perTrip);
  remainingBudgetEl.textContent = `${formatCurrency(data.remainingBudget)} EUR`;
  remainingTripsEl.textContent = data.remainingTrips;
  lastUpdatedEl.textContent = formatDate(data.lastUpdated);
}

// Fetch current budget
async function fetchBudget() {
  try {
    const response = await fetch('/api/budget');
    if (!response.ok) throw new Error('Failed to fetch budget');
    const data = await response.json();
    updateUI(data);
  } catch (error) {
    console.error('Error fetching budget:', error);
    showToast('Failed to load budget', 'error');
  }
}

// Update budget
async function updateBudget(amount) {
  try {
    document.body.classList.add('loading');
    const response = await fetch('/api/budget', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remainingBudget: amount })
    });
    
    if (!response.ok) throw new Error('Failed to update budget');
    
    const data = await response.json();
    updateUI(data);
    showToast('Budget updated');
    newBudgetInput.value = '';
  } catch (error) {
    console.error('Error updating budget:', error);
    showToast('Failed to update budget', 'error');
  } finally {
    document.body.classList.remove('loading');
  }
}

// Reset budget
async function resetBudget() {
  try {
    document.body.classList.add('loading');
    const response = await fetch('/api/reset', {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to reset budget');
    
    const data = await response.json();
    updateUI(data);
    showToast('Budget reset to 600 EUR');
  } catch (error) {
    console.error('Error resetting budget:', error);
    showToast('Failed to reset budget', 'error');
  } finally {
    document.body.classList.remove('loading');
  }
}

// Event listeners
updateBtn.addEventListener('click', () => {
  const amount = parseFloat(newBudgetInput.value);
  if (isNaN(amount) || amount < 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  updateBudget(amount);
});

newBudgetInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    updateBtn.click();
  }
});

resetBtn.addEventListener('click', () => {
  if (confirm('Reset budget to 600 EUR?')) {
    resetBudget();
  }
});

// Initial load
fetchBudget();

// Refresh every 30 seconds (in case partner updates)
setInterval(fetchBudget, 30000);
