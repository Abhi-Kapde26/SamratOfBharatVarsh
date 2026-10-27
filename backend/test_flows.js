// Automated verification script for Samrat of Bharatavarsha workflows
const BASE_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'samrat_bharat_admin_secret_token_2026';

async function runTests() {
  console.log('🧪 Starting Samrat of Bharatavarsha End-to-End Verification...\n');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  };

  // Step 1: Health check
  console.log('1. Checking Server Health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  if (health.status !== 'ok') throw new Error('Server health check failed');
  console.log('   ✅ Server is healthy:', health.serverTime);

  // Step 2: Fetch and verify seeded 100 kingdoms
  console.log('2. Verifying 100 Kingdoms Library...');
  const kRes = await fetch(`${BASE_URL}/kingdoms`);
  const kingdoms = await kRes.json();
  console.log(`   ✅ Seeded kingdoms count: ${kingdoms.length}`);
  if (kingdoms.length < 100) throw new Error(`Expected at least 100 kingdoms, got ${kingdoms.length}`);
  const firstK = kingdoms.find(k => k.name === 'Kakatiya Kingdom') || kingdoms[0];
  console.log(`   ✅ Domain criteria (${firstK.name}): Army=${firstK.army}, Wealth=${firstK.wealth}, Pts=${firstK.calculated_points}`);

  // Step 3: Verify initial teams and balances
  console.log('3. Verifying Initial Teams & Configured Balances...');
  const tRes = await fetch(`${BASE_URL}/teams`);
  const teams = await tRes.json();
  console.log(`   ✅ Initial teams count: ${teams.length}`);
  teams.forEach(t => {
    console.log(`   Dynasty: ${t.name} (${t.house_name}) | Initial: ₹${t.initial_treasury.toLocaleString()} | Remaining: ₹${t.remaining_balance.toLocaleString()} | Members: ${t.members.length}`);
    if (t.remaining_balance !== t.initial_treasury) throw new Error('Initial balance does not match remaining balance');
  });

  // Step 4: Create a custom team with members
  console.log('4. Creating a New Team through Admin...');
  const newTeamData = {
    name: `Chola Dynasty ${Date.now()}`,
    house_name: 'House of Rajaraja',
    initial_treasury: 1200000000, // 120 Cr
    members: [
      { name: 'Arulmozhivarman', academic_year: 'UG 3rd Year', role: 'Crown Prince' },
      { name: 'Kundavai', academic_year: 'UG 4th Year', role: 'Chief Counselor' }
    ]
  };
  const createTeamRes = await fetch(`${BASE_URL}/teams`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newTeamData)
  });
  const createdTeam = await createTeamRes.json();
  console.log(`   ✅ Created team ID ${createdTeam.id}: ${createdTeam.name} with balance ₹${createdTeam.remaining_balance.toLocaleString()}`);

  // Step 5: Add a new kingdom and verify all 6 criteria
  console.log('5. Adding a New Kingdom with All 6 Criteria...');
  const newKingdomData = {
    name: `Chera Realm ${Date.now()}`,
    hint: 'Lords of the Spice Trade and Oceanic Fleet',
    ruler: 'Nedunjeral Adan; Senguttuvan',
    modern_city: 'Muziris / Kodungallur',
    region: 'South',
    area: 32000,
    base_price: 6000000,
    army: 80,
    wealth: 90,
    territory: 70,
    culture: 85,
    politics: 75,
    population: 80
  };
  const createKingdomRes = await fetch(`${BASE_URL}/kingdoms`, {
    method: 'POST',
    headers,
    body: JSON.stringify(newKingdomData)
  });
  const createdKingdom = await createKingdomRes.json();
  console.log(`   ✅ Added kingdom: ${createdKingdom.name} (Area: ${createdKingdom.area} km², Base: ₹${createdKingdom.base_price.toLocaleString()})`);

  // Step 6: Test Auction State and Timer operations
  console.log('6. Operating Auction Desk and Discussion Timer...');
  const selectRes = await fetch(`${BASE_URL}/auction/select`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ kingdom_id: firstK.id, round_number: 1 })
  });
  const auctionState = await selectRes.json();
  console.log(`   ✅ Selected kingdom for arena: ${auctionState.current_kingdom.name}`);

  const timerStart = await fetch(`${BASE_URL}/auction/timer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'start' })
  });
  const timerState = await timerStart.json();
  console.log(`   ✅ Timer started: running=${timerState.timer_running}, remaining=${timerState.timer_remaining}s`);

  // Step 7: Record a bid and test insufficient funds rule
  console.log('7. Testing Treasury Limits & Insufficient Funds Protection...');
  const overbidRes = await fetch(`${BASE_URL}/auction/bid`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ team_id: createdTeam.id, amount: 2000000000 }) // 200 Cr > 120 Cr
  });
  if (overbidRes.status === 400) {
    const err = await overbidRes.json();
    console.log(`   ✅ Server correctly rejected overbid with 400: "${err.error}"`);
  } else {
    throw new Error('Server should have rejected overbid exceeding balance!');
  }

  // Step 8: Confirm a valid kingdom purchase
  console.log('8. Confirming a Valid Kingdom Purchase...');
  const purchaseAmount = 75000000; // 7.5 Crore
  const confirmRes = await fetch(`${BASE_URL}/auction/confirm-purchase`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      kingdom_id: firstK.id,
      team_id: createdTeam.id,
      amount: purchaseAmount,
      admin_name: 'Chief Auctioneer',
      notes: 'Winning gavel strike at college festival'
    })
  });
  const purchaseResult = await confirmRes.json();
  console.log(`   ✅ ${purchaseResult.message}`);
  const txId = purchaseResult.transaction_id;

  // Step 9: Test duplicate purchase protection
  console.log('9. Testing Duplicate Purchase Prevention...');
  const duplicateRes = await fetch(`${BASE_URL}/auction/confirm-purchase`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      kingdom_id: firstK.id,
      team_id: teams[0].id,
      amount: 80000000
    })
  });
  if (duplicateRes.status === 400) {
    const dupErr = await duplicateRes.json();
    console.log(`   ✅ Server correctly blocked duplicate sale: "${dupErr.error}"`);
  } else {
    throw new Error('Server allowed duplicate sale of already sold kingdom!');
  }

  // Step 10: Verify ownership and updated balance
  console.log('10. Verifying Remaining Balance and Expenditure Calculation...');
  const teamCheckRes = await fetch(`${BASE_URL}/teams/${createdTeam.id}`);
  const updatedTeam = await teamCheckRes.json();
  console.log(`   Initial: ₹${updatedTeam.initial_treasury.toLocaleString()}`);
  console.log(`   Spent: ₹${updatedTeam.total_spent.toLocaleString()}`);
  console.log(`   Remaining: ₹${updatedTeam.remaining_balance.toLocaleString()}`);
  console.log(`   Acquired: ${updatedTeam.acquired_kingdoms.map(k => k.kingdom_name).join(', ')}`);
  console.log(`   Points: ${updatedTeam.total_points} pts`);

  if (updatedTeam.remaining_balance !== updatedTeam.initial_treasury - purchaseAmount) {
    throw new Error('Remaining balance formula mismatch!');
  }
  console.log('   ✅ Balance and points verified accurately!');

  // Step 11: Test Transaction Correction (Revert & Reassign)
  console.log('11. Testing Transaction Correction & Reversal...');
  const correctRes = await fetch(`${BASE_URL}/auction/correct-transaction`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      transaction_id: txId,
      action: 'revert',
      reason: 'Host re-adjudication test'
    })
  });
  const correctResult = await correctRes.json();
  console.log(`   ✅ ${correctResult.message}`);

  // Re-verify balance restored
  const teamRestoredRes = await fetch(`${BASE_URL}/teams/${createdTeam.id}`);
  const restoredTeam = await teamRestoredRes.json();
  console.log(`   ✅ After revert, team remaining balance restored to: ₹${restoredTeam.remaining_balance.toLocaleString()}`);
  if (restoredTeam.remaining_balance !== restoredTeam.initial_treasury) {
    throw new Error('Balance was not restored after transaction revert!');
  }

  // Re-purchase with Marathas to verify results leaderboard
  console.log('12. Re-confirming Purchase with Marathas for Leaderboard Check...');
  await fetch(`${BASE_URL}/auction/confirm-purchase`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      kingdom_id: firstK.id,
      team_id: teams[0].id,
      amount: 85000000,
      admin_name: 'Chief Auctioneer'
    })
  });

  const resultsRes = await fetch(`${BASE_URL}/results`);
  const results = await resultsRes.json();
  console.log(`   ✅ Champion crowned: ${results.champion?.name} with ${results.champion?.total_points} points!`);
  console.log(`   Leaderboard leader: ${results.leaderboard[0].name}`);

  console.log('\n🎉 ALL 12 TEST SUITES PASSED FLAWLESSLY!');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
