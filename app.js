const defaultState = {
  balance: 0, spent: 0,
  charges: [],
  debts: [],
  goals: [],
  topGoalIndex: null,
  transactions: []
};
let savedState=null;
try{savedState=JSON.parse(localStorage.getItem('budgetBuddyState')||localStorage.getItem('pennywiseState'))}catch(error){savedState=null}
const state={...defaultState,...savedState};

const money = n => `$${Number(n).toFixed(2)}`;
const $ = s => document.querySelector(s);

function renderLists(){
  $('#chargeList').innerHTML = state.charges.length ? state.charges.map((x,i)=>`<div class="list-item"><span class="list-icon">${x.icon}</span><span><strong>${escapeHtml(x.name)}</strong><small>Repeats ${x.frequency||'monthly'} · ${x.dueDate?`Next payment: ${formatChargeDate(x.dueDate)}`:(x.date||'Add the next payment date')}</small></span><strong class="list-amount">${money(x.amount)}</strong><button class="list-action" onclick="markDone('charge',${i})">I paid this</button></div>`).join('') : '<div class="empty-state"><span>↻</span><strong>No regular costs yet</strong><p>Add something you pay for again and again.</p></div>';
  $('#debtList').innerHTML = state.debts.length ? state.debts.map((x,i)=>`<div class="list-item"><span class="list-icon">${x.icon}</span><span><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.reason||x.date||'Money borrowed')}${x.dueDate?` · Pay back by ${formatChargeDate(x.dueDate)}`:' · No payback date'}</small></span><strong class="list-amount">${money(x.amount)}</strong><button class="list-action" onclick="markDone('debt',${i})">I paid them back</button></div>`).join('') : '<div class="list-item"><span class="list-icon">✓</span><span><strong>Nothing to pay back!</strong><small>You do not owe anyone money.</small></span></div>';
  const selectedTopIndex=Number.isInteger(state.topGoalIndex)&&state.topGoalIndex>=0&&state.topGoalIndex<state.goals.length?state.topGoalIndex:(state.goals.length?0:null);
  state.topGoalIndex=selectedTopIndex;
  $('#goalsList').innerHTML = state.goals.length ? state.goals.map((g,i)=>{const p=g.target?Math.min(100,Math.round(g.saved/g.target*100)):0;const isTop=i===selectedTopIndex;return `<article class="goal-card"><button class="top-goal-button ${isTop?'active':''}" onclick="setTopGoal(${i})" ${isTop?'disabled':''}>${isTop?'★ Main goal':'☆ Make main'}</button><div class="goal-emoji">${g.emoji}</div><h3>${escapeHtml(g.name)}</h3><p>${money(g.saved)} saved out of ${money(g.target)}</p><div class="progress goal"><i style="width:${p}%"></i></div><div class="goal-row"><small>${p}% done</small><b>${money(Math.max(0,g.target-g.saved))} left to save</b></div><div class="goal-actions"><button class="secondary-btn" onclick="withdrawSavings(${i})" ${g.saved<5?'disabled':''}>− Move back $5</button><button class="secondary-btn" onclick="quickSave(${i})">＋ Save $5</button></div></article>`}).join('') : '<div class="panel empty-state goals-empty"><span>◇</span><strong>No saving goals yet</strong><p>Make a goal for something you really want.</p></div>';
  $('#chargeTotal').textContent=money(state.charges.reduce((a,b)=>a+b.amount,0));
  const totalDebt=state.debts.reduce((a,b)=>a+b.amount,0);
  $('#owedTotal').textContent=money(totalDebt);
  $('#overviewDebtTotal').textContent=money(totalDebt);
  $('#overviewDebtList').innerHTML=state.debts.length?state.debts.map(debt=>{const due=getDebtDueInfo(debt.dueDate);return `<div class="overview-debt-item"><div><strong>${escapeHtml(debt.name)}</strong><small>${escapeHtml(debt.reason||debt.date||'Money borrowed')}</small></div><div class="overview-debt-due"><strong>${money(debt.amount)}</strong><span class="debt-status ${due.className}">${due.status}</span><small>${due.detail}</small></div></div>`}).join(''):'<div class="debt-empty"><span>✓</span><strong>Nothing to pay back</strong><small>Nice! You do not owe anyone money.</small></div>';
  $('#chargeBadge').textContent=state.charges.length;
  $('#chargeBadge').hidden=state.charges.length===0;
  $('#chargeStatus').textContent=state.charges.length ? `${state.charges.length} SET` : 'NONE';
  $('#chargeNext').textContent=state.charges.length ? `Next one: ${state.charges[0].name}` : 'Nothing set up yet';
  $('#owedPeople').textContent=state.debts.length ? `Money owed to ${state.debts.length} ${state.debts.length===1?'person':'people'}` : 'Nothing to pay back';
  const topGoal=selectedTopIndex===null?null:state.goals[selectedTopIndex];
  $('#topGoalName').textContent=topGoal ? topGoal.name : 'No saving goal yet';
  $('#topGoalSaved').textContent=money(topGoal?.saved||0);
  $('#topGoalTarget').textContent=` saved out of ${money(topGoal?.target||0)}`;
  const topPercent=topGoal?.target ? Math.min(100,Math.round(topGoal.saved/topGoal.target*100)) : 0;
  $('#topGoalPercent').textContent=`${topPercent}%`;
  $('#topGoalProgress').style.width=`${topPercent}%`;
  $('#addSavingsButton').disabled=!topGoal;
}

function updateSummary(){
  $('#balanceValue').textContent=money(state.balance);
  $('#spentValue').textContent=money(state.spent);
  renderLists();
  renderSpending();
  localStorage.setItem('budgetBuddyState',JSON.stringify(state));
}

const spendingCategories={
  'Food & drinks':{className:'food',color:'#6c55e8'},
  'Fun':{className:'fun',color:'#f4a24b'},
  'Transport':{className:'transport',color:'#5aa0e8'},
  'Other':{className:'other',color:'#b7bdca'}
};

function renderSpending(){
  const totals=Object.fromEntries(Object.keys(spendingCategories).map(category=>[category,{amount:0,count:0}]));
  state.transactions.forEach(transaction=>{totals[transaction.category].amount+=transaction.amount;totals[transaction.category].count+=1});
  $('#chartTotal').textContent=money(state.spent);
  $('#spendingLegend').innerHTML=Object.entries(totals).map(([category,total])=>`<div><i class="dot ${spendingCategories[category].className}"></i><span><b>${category}</b><small>${total.count} ${total.count===1?'purchase':'purchases'}</small></span><strong>${money(total.amount)}</strong></div>`).join('');
  if(state.spent===0){
    $('#spendingDonut').style.background='#eceef3';
  }else{
    let position=0;
    const segments=Object.entries(totals).filter(([,total])=>total.amount>0).map(([category,total])=>{const start=position;position+=total.amount/state.spent*100;return `${spendingCategories[category].color} ${start}% ${position}%`});
    $('#spendingDonut').style.background=`conic-gradient(${segments.join(',')})`;
  }
  renderDailyChart();
  $('#transactionList').innerHTML=state.transactions.length ? state.transactions.map((transaction,index)=>`<div class="list-item"><span class="list-icon">${spendingCategories[transaction.category].className==='food'?'🍔':spendingCategories[transaction.category].className==='fun'?'★':spendingCategories[transaction.category].className==='transport'?'↗':'•'}</span><span><strong>${escapeHtml(transaction.item)}</strong><small>${transaction.category} · ${transaction.date}</small></span><strong class="list-amount">−${money(transaction.amount)}</strong><button class="list-action" onclick="deleteSpending(${index})">Remove</button></div>`).join('') : '<div class="empty-state"><span>↘</span><strong>No purchases added yet</strong><p>Add something you bought and it will show up here.</p></div>';
  const nudge=$('.nudge p');
  nudge.innerHTML=state.transactions.length?`<strong>You added ${state.transactions.length} ${state.transactions.length===1?'purchase':'purchases'} this week.</strong><br>Great job keeping track of your allowance!`:'<strong>No spending added yet.</strong><br>Helpful money tips will show up here.';
}

function renderDailyChart(){
  const days=[];
  const today=new Date();today.setHours(0,0,0,0);
  for(let offset=6;offset>=0;offset--){const date=new Date(today);date.setDate(today.getDate()-offset);days.push({date,key:localDateKey(date),amount:0})}
  state.transactions.forEach(transaction=>{
    const key=transaction.rawDate||legacyTransactionDate(transaction.date);
    const day=days.find(item=>item.key===key);
    if(day)day.amount+=transaction.amount;
  });
  const total=days.reduce((sum,day)=>sum+day.amount,0);
  $('#dailyChartTotal').textContent=`${money(total)} total`;
  const width=520,height=180,left=28,right=18,top=18,bottom=20;
  const plotWidth=width-left-right,plotHeight=height-top-bottom;
  const max=Math.max(...days.map(day=>day.amount),1);
  const points=days.map((day,index)=>({x:left+(index/(days.length-1))*plotWidth,y:top+plotHeight-(day.amount/max)*plotHeight,amount:day.amount}));
  const line=points.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area=`${line} L ${points.at(-1).x.toFixed(1)} ${(top+plotHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(top+plotHeight).toFixed(1)} Z`;
  const grid=[0,.5,1].map(level=>{const y=top+plotHeight-level*plotHeight;return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" class="chart-grid"/>`}).join('');
  const dots=points.map(point=>`<g><circle cx="${point.x}" cy="${point.y}" r="5" class="chart-dot"/><title>${money(point.amount)}</title></g>`).join('');
  $('#dailyLineChart').innerHTML=`${grid}<path d="${area}" class="chart-area"/><path d="${line}" class="chart-line"/>${dots}`;
  $('#dailyChartLabels').innerHTML=days.map(day=>`<span>${day.date.toLocaleDateString('en-US',{weekday:'short'})}</span>`).join('');
}

function localDateKey(date){const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,'0');const day=String(date.getDate()).padStart(2,'0');return `${year}-${month}-${day}`}
function legacyTransactionDate(label){if(!label)return '';const parsed=new Date(`${label}, ${new Date().getFullYear()}`);return Number.isNaN(parsed.getTime())?'':localDateKey(parsed)}

function escapeHtml(value){const element=document.createElement('div');element.textContent=value;return element.innerHTML}
function formatChargeDate(date){return new Date(`${date}T00:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
function getDebtDueInfo(dueDate){
  if(!dueDate)return {status:'NO DATE',detail:'No payback date',className:'no-date'};
  const today=new Date();today.setHours(0,0,0,0);
  const due=new Date(`${dueDate}T00:00:00`);
  const days=Math.round((due-today)/86400000);
  if(days<0){const count=Math.abs(days);return {status:'OVERDUE',detail:`${count} ${count===1?'day':'days'} overdue`,className:'overdue'}}
  if(days===0)return {status:'DUE TODAY',detail:'Due today',className:'today'};
  return {status:'UPCOMING',detail:`${days} ${days===1?'day':'days'} left`,className:'upcoming'};
}
function advanceChargeDate(charge){
  const date=charge.dueDate?new Date(`${charge.dueDate}T00:00:00`):new Date();
  if(charge.frequency==='Daily')date.setDate(date.getDate()+1);
  else if(charge.frequency==='Weekly')date.setDate(date.getDate()+7);
  else if(charge.frequency==='Every 2 weeks')date.setDate(date.getDate()+14);
  else if(charge.frequency==='Every 3 months')date.setMonth(date.getMonth()+3);
  else if(charge.frequency==='Yearly')date.setFullYear(date.getFullYear()+1);
  else date.setMonth(date.getMonth()+1);
  charge.dueDate=date.toISOString().slice(0,10);
}

document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();showSection(link.dataset.section)}));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.jump)));
function showSection(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.section===id));$('#sidebar').classList.remove('open');scrollTo(0,0)}

const modalConfig={
  'add-money':{title:'Add allowance money',desc:'Add allowance, gift money, or money you earned from chores.',fields:[['amount','How much money did you get?','number'],['source','Where did the money come from? (optional)','text',false]]},
  'log-spending':{title:'Add something you bought',desc:'Write it down so you know where your allowance went.',fields:[['item','What did you buy?','text'],['amount','How much did it cost?','number'],['category','What kind of purchase was it?','select',true,['Food & drinks','Fun','Transport','Other']],['date','When did you buy it?','date']]},
  'bulk-spending':{title:'Add a list of purchases',desc:'Put each thing you bought on its own row.',fields:[]},
  'add-savings':{title:'Put money in savings',desc:'Move some of your allowance to your main saving goal.',fields:[['amount','How much do you want to save?','number']]},
  'new-charge':{title:'Add a regular cost',desc:'Add something you pay for again and again, then choose how often.',fields:[['name','What do you pay for?','text'],['amount','How much does it cost each time?','number'],['frequency','How often?','select',true,['Daily','Weekly','Every 2 weeks','Monthly','Every 3 months','Yearly']],['date','When is the next payment?','date']]},
  'new-debt':{title:'Add debt',desc:'Write down money you need to pay back. The payback date is optional.',fields:[['name','Who do you need to pay back?','text'],['amount','How much do you owe?','number'],['reason','What did you borrow money for?','text'],['date','Payback date (optional)','date',false]]},
  'new-goal':{title:'Make a saving goal',desc:'Choose something you really want to save for.',fields:[['name','What are you saving for?','text'],['target','How much money do you need?','number']]}
};
let modalType='';
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
function bulkRow(){const today=new Date().toISOString().slice(0,10);return `<div class="bulk-row"><input class="bulk-item" type="text" placeholder="Purchase name" aria-label="Purchase name"><input class="bulk-amount" type="number" min="0.01" step="0.01" placeholder="0.00" aria-label="Amount"><select class="bulk-category" aria-label="Category"><option>Food & drinks</option><option>Fun</option><option>Transport</option><option>Other</option></select><input class="bulk-date" type="date" value="${today}" aria-label="Purchase date"><button type="button" class="bulk-remove" aria-label="Remove row" onclick="removeBulkRow(this)">×</button></div>`}
function addBulkRow(){const rows=$('#bulkRows');rows.insertAdjacentHTML('beforeend',bulkRow());rows.lastElementChild.querySelector('.bulk-item').focus()}
function openModal(type){
  modalType=type;
  const c=modalConfig[type];
  $('#modalTitle').textContent=c.title;
  $('#modalDescription').textContent=c.desc;
  $('.modal').classList.toggle('bulk-modal',type==='bulk-spending');
  $('#modalSubmit').textContent=type==='bulk-spending'?'Add all purchases':'Save';
  if(type==='bulk-spending'){
    $('#formFields').innerHTML=`<div class="bulk-sheet"><div class="bulk-header"><span>What you bought</span><span>Cost</span><span>Type</span><span>Day</span><span></span></div><div id="bulkRows">${bulkRow()}${bulkRow()}${bulkRow()}</div></div><button type="button" class="secondary-btn add-row-btn" onclick="addBulkRow()">＋ Add another row</button>`;
  }else{
    $('#formFields').innerHTML=c.fields.map(f=>{
      const required=f[3]===false?'':'required';
      const minimum=f[0]==='balance'?'0':'0.01';
      const control=f[2]==='select'
        ? `<select id="${f[0]}" name="${f[0]}" ${required}>${f[4].map(option=>`<option value="${option}">${option}</option>`).join('')}</select>`
        : `<input id="${f[0]}" name="${f[0]}" type="${f[2]}" ${f[2]==='number'?`min="${minimum}" step="0.01"`:''} ${required}>`;
      return `<div class="field"><label for="${f[0]}">${f[1]}</label>${control}</div>`;
    }).join('');
  }
  $('#modalBackdrop').hidden=false;
  if(type==='log-spending')$('#date').value=new Date().toISOString().slice(0,10);
  setTimeout(()=>$('#formFields input')?.focus(),30);
}
function closeModal(){ $('#modalBackdrop').hidden=true; }
$('#modalClose').onclick=closeModal;
$('#modalBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

$('#modalForm').addEventListener('submit',e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
  if(modalType==='bulk-spending'){
    const enteredRows=[...document.querySelectorAll('.bulk-row')].map(row=>({item:row.querySelector('.bulk-item').value.trim(),amountText:row.querySelector('.bulk-amount').value,category:row.querySelector('.bulk-category').value,date:row.querySelector('.bulk-date').value})).filter(row=>row.item||row.amountText);
    if(enteredRows.some(row=>!row.item||!row.amountText||+row.amountText<=0||!row.date))return toast('Fill in the name and cost for each row you use');
    const rows=enteredRows.map(row=>({item:row.item,amount:+row.amountText,category:row.category,date:row.date}));
    if(!rows.length)return toast('Add at least one thing you bought');
    const purchases=rows.map(row=>({...row,rawDate:row.date,date:new Date(`${row.date}T00:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}));
    const total=purchases.reduce((sum,purchase)=>sum+purchase.amount,0);
    state.transactions.unshift(...purchases);state.spent+=total;state.balance-=total;
    updateSummary();closeModal();toast(`Added ${purchases.length} purchases that cost ${money(total)} total`);return;
  }
  if(modalType==='add-money'){const amount=+data.amount;state.balance+=amount;toast(`${money(amount)} added to the money you have`);}
  if(modalType==='log-spending'){const amount=+data.amount;state.transactions.unshift({item:data.item,amount,category:data.category,rawDate:data.date,date:new Date(`${data.date}T00:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})});state.spent+=amount;state.balance-=amount;toast(`Added your ${money(amount)} purchase`);}
  if(modalType==='add-savings' && state.goals.length){const goal=state.goals[state.topGoalIndex];const requested=+data.amount;const amt=Math.min(requested,Math.max(0,goal.target-goal.saved));if(amt>state.balance){toast('You do not have enough money for that');closeModal();return}if(amt===0){toast('You already finished this goal!');closeModal();return}goal.saved+=amt;state.balance-=amt;toast(`${money(amt)} saved for ${goal.name}`);}
  if(modalType==='new-charge'){state.charges.push({icon:'↻',name:data.name,dueDate:data.date,frequency:data.frequency,amount:+data.amount});toast('Regular cost added');}
  if(modalType==='new-debt'){state.debts.push({icon:data.name[0].toUpperCase(),name:data.name,reason:data.reason,dueDate:data.date||'',amount:+data.amount});toast('Debt added');}
  if(modalType==='new-goal'){state.goals.push({emoji:'⚽',name:data.name,saved:0,target:+data.target});if(state.topGoalIndex===null)state.topGoalIndex=0;toast('New saving goal made!');}
  updateSummary();closeModal();
});

window.markDone=(type,i)=>{
  const item=type==='debt'?state.debts[i]:state.charges[i];
  state.balance-=item.amount;
  if(type==='debt'){
    state.debts.splice(i,1);
    toast(`You paid back ${money(item.amount)}. It was taken from the money you have.`);
  }else{
    advanceChargeDate(item);
    toast(`Paid ${money(item.amount)}. You will pay it again on ${formatChargeDate(item.dueDate)}.`);
  }
  updateSummary();
};
window.deleteSpending=i=>{const removed=state.transactions.splice(i,1)[0];state.spent=Math.max(0,state.spent-removed.amount);updateSummary();toast('Purchase removed from your list')};
window.setTopGoal=i=>{state.topGoalIndex=i;updateSummary();toast(`${state.goals[i].name} is now your main saving goal`)};
window.addBulkRow=addBulkRow;
window.removeBulkRow=button=>{const rows=document.querySelectorAll('.bulk-row');if(rows.length===1)return toast('Keep at least one row');button.closest('.bulk-row').remove()};
window.quickSave=i=>{const goal=state.goals[i];const amount=Math.min(5,Math.max(0,goal.target-goal.saved));if(amount===0)return toast('You already finished this goal!');if(state.balance<amount)return toast('You do not have enough money for that');goal.saved+=amount;state.balance-=amount;updateSummary();toast(`${money(amount)} added to your saving goal!`)};
window.withdrawSavings=i=>{const goal=state.goals[i];if(goal.saved<5)return toast('There is less than $5 in this goal');goal.saved-=5;state.balance+=5;updateSummary();toast('$5 moved back to the money you can spend')};
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),2800)}
let hidden=false;$('#toggleBalance').onclick=()=>{hidden=!hidden;$('#balanceValue').textContent=hidden?'$••••••':money(state.balance);$('#toggleBalance').textContent=hidden?'○':'◉'};
$('#menuButton').onclick=()=>$('#sidebar').classList.toggle('open');
$('#todayLabel').textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase();
updateSummary();
