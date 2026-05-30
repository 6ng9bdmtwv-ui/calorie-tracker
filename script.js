const GOAL_KCAL = 1600;

const categories = {
    "すき家 メイン": [
        {name: "たたき丼（ごはん140g）",kcal: 505 },
        {name: "お子様そぼろ",kcal: 319},
        {name: "お子様カレー",kcal: 258},
        {name: "チキンお食事サラダ",kcal: 247},
        {name: "カレーミニ",kcal: 390},
        {name: "鮭",kcal: 120},
        {name: "さば",kcal: 235},
    ],
    "すき家 サイド":[
        {name: "唐揚げ１個",kcal: 61},
        {name: "おんたま",kcal: 84},
        {name: "りんご", kcal: 19},
        {name: "バニラシェイクS", kcal: 176},
        {name: "チーズケーキシェイクS", kcal: 216},
    ]
};

let log = [];
let activeTab = 0;
let isDeleteMode = false;
let deletedItems = [] //これがゴミ箱
const tabKeys = Object.keys(categories);

function init(){
    const saved = localStorage.getItem("log");
    if(saved){
        log = JSON.parse(saved);
    }
    const now = new Date();
    const options = {year: "numeric", month: "long", day:"numeric", weekday: "long"};
    document.getElementById("today-date").textContent = now.toLocaleDateString("ja-JP",options);

    const savedDeleted = localStorage.getItem("deletedItems");
    if(savedDeleted){
        deletedItems = JSON.parse(savedDeleted);
    }
   
    renderCategorySelect(); 
    renderTabs();
    renderMenu();
    renderLog();
    updateTotal();
}

function renderTabs(){
    const tabBar = document.getElementById("tab-bar");
    tabBar.innerHTML = "";

    tabKeys.forEach((label, index) =>{
        const btn = document.createElement("button");
        btn.className = "tab-btn" + (index === activeTab ? " active" : "");
        btn.textContent = label;

        btn.addEventListener("click", () => {
            activeTab = index;
            renderTabs();
            renderMenu();
        });
        tabBar.appendChild(btn);
    });
}

function renderMenu(){
    const grid = document.getElementById("menu-grid");
    grid. innerHTML = "";

    const items = categories[tabKeys[activeTab]];

    items.forEach((item,index) =>{
        const btn = document.createElement("button");
        btn.className = "menu-btn";
        btn.innerHTML = `
         <span class="m-name">${item.name}</span>
        <span class="m-kcal">${item.kcal}kcal</span>
         ${isDeleteMode ? '<span class="m-delete">×</span>' : ""}
            `;

        if(isDeleteMode){
            btn.addEventListener("click", () => deleteMenuItem(index));
        }else {
            btn.addEventListener("click", () => addItem(item));
        }
        grid.appendChild(btn);

    });
}

function addItem(item){
    console.log("追加されたアイテム:",item);
    log.push({
        id: Date.now() + Math.random(),
        name: item.name,
        kcal: item.kcal,
    });

    renderLog();
    updateTotal();
    saveLog();
}

function renderLog(){
    const logList = document.getElementById("log-list");

    if(log.length === 0){
        logList.innerHTML = '<p class="empty-msg">まだ何も記録されていません</p>';
        return;
    }
    logList.innerHTML ="";

    [...log].reverse().forEach((item)=>{
        const div = document.createElement("div");
        div.className = "log-item";
        div.innerHTML = `
        <span>${item.name}</span>
        <span>${item.kcal}kcal</span>
        <button onclick="removeItem(${item.id})">×</button>
        `;

        logList.appendChild(div);
    })
}

function updateTotal(){
    const total = log.reduce((sum,item) => sum + item.kcal,0);
    document.getElementById("total-kcal").textContent = total;

    const remaining = GOAL_KCAL - total;
    const goalText = document.getElementById("goal-remaining");
    if(remaining>=0){
        goalText.textContent = "残り" + remaining + "kcal"; 
    }else{
        goalText.textContent = "目標を" + Math.abs(remaining) + "kcalオーバー...";
    }

    const percent = Math.min((total/ GOAL_KCAL)*100, 100);
    document.getElementById("progress-bar").style.width = percent + "%";
}

function removeItem(id){
    log = log. filter((item)=> item.id !== id);
    renderLog();
    updateTotal();
    saveLog();
}

function clearAll() {
  if (log.length === 0) return;
  
  const confirmed = document.getElementById("confirm-area");
  confirmed.style.display = "block";
}

function addMenu(){
  const selectValue = document.getElementById("input-category-select").value;
  const newValue = document.getElementById("input-category-new").value.trim();
  const category = selectValue !== "" ? selectValue : newValue;

  const name = document.getElementById("input-name").value.trim();
  const kcal = Number(document.getElementById("input-kcal").value);

  if(category === "" || name === "" || kcal <= 0){
    alert("お店の名前、メニュー名、kcalを全て入力してください");
    return;
  }

  if(!categories[category]){
    categories[category] = [];
  }

  categories[category].push({ name: name, kcal: kcal });

  tabKeys.length = 0;
  Object.keys(categories).forEach(key => tabKeys.push(key));

  document.getElementById("input-category-select").value = "";
  document.getElementById("input-category-new").value = "";
  document.getElementById("input-category-new").style.display = "none";
  document.getElementById("input-name").value = "";
  document.getElementById("input-kcal").value = "";

  renderCategorySelect();
  renderTabs();
  renderMenu();
}

function deleteMenuItem(index){
    const currentCategory = tabKeys[activeTab];
    const deleted = categories[currentCategory].splice(index, 1)[0];

    deletedItems.push({
        type: "item",
        category: currentCategory,
        item: deleted,
    });

    saveDeleted();
    renderMenu();
    renderTrash();
}

function deleteTab(){
    const currentCategory = tabKeys[activeTab];
    deletedItems.push({
        type: "tab",
        category: currentCategory,
        items: categories[currentCategory],
    });

    delete categories[currentCategory];
    tabKeys.length = 0;
    Object.keys(categories).forEach(key => tabKeys.push(key));


    activeTab = 0;
    saveDeleted();
    renderCategorySelect();
    renderTabs();
    renderMenu();
    renderTrash();
}

function toggleDeleteMode(){
    isDeleteMode = !isDeleteMode;

    const btn = document.getElementById("delete-mode-btn");
    const deleteTabBtn = document.getElementById("delete-tab-btn");
    const trashSection = document.getElementById("trash-section");
    
    if(isDeleteMode){
        btn.textContent = "削除モード終了";
        btn.classList.add("active");
        deleteTabBtn.style.display = "inline-block";
        trashSection.style.display = "block";
    }else{
        btn.textContent = "削除モード";
        btn.classList.remove("active"); 
        deleteTabBtn.style.display ="none";
        trashSection.style.display = "none";
    }

    renderMenu();
}

function confirmClear() {
  log = [];
  renderLog();
  updateTotal();
  saveLog();
  document.getElementById("confirm-area").style.display = "none";
}

function cancelClear() {
  document.getElementById("confirm-area").style.display = "none";
}

function saveLog(){
    localStorage.setItem("log",JSON.stringify(log));
}

function saveDeleted(){
    localStorage.setItem("deletedItems",JSON.stringify(deletedItems));
}

function renderTrash(){
    const trashList = document.getElementById("trash-list");

    if(deletedItems.length === 0){
        trashList.innerHTML = '<p class="empty-msg">削除したものはありません</p>'
        return;
    }

    trashList.innerHTML ="";

    [...deletedItems].reverse().forEach((deleted, index) => {
        const div = document.createElement("div");
        div.className = "log-item";

        if(deleted.type ==="item"){
            div.innerHTML =`
            <span>${deleted.category} / ${deleted.item.name}</span>
            <span>${deleted.item.kcal}kcal</span>
            <button onclick="restoreItem(${deletedItems.length - 1 - index})">復活</button>
            `;
        }else {
            div.innerHTML =`
            <span>🗂 ${deleted.category}（${deleted.items.length}件）</span>
            <span></span>
            <button onclick="restoreItem(${deletedItems.length - 1 - index})">復活</button>
            `;
        }

        trashList.appendChild(div);
    });
}

function restoreItem(index){
    const deleted = deletedItems[index];

    if(deleted.type === "item"){
        if(!categories[deleted.category]){
            categories[deleted.category] =[];
            tabKeys.length = 0;
            Object.keys(categories).forEach(key => tabKeys.push(key));
        }
        categories[deleted.category].push(deleted.item);
    }else{
        categories[deleted.category] = deleted.items;
        tabKeys.length = 0;
        Object.keys(categories).forEach(key => tabKeys.push(key));
    }

    deletedItems.splice(index, 1);
    saveDeleted();
    renderCategorySelect();
    renderTabs();
    renderMenu();
    renderTrash();
}

function renderCategorySelect() {
  const select = document.getElementById("input-category-select");
  const currentValue = select.value;

  select.innerHTML = '<option value="">＋ 新しいお店を追加</option>';

  tabKeys.forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    select.appendChild(option);
  });

  select.value = currentValue;
}

document.getElementById("input-category-select").addEventListener("change", function() {
  const newInput = document.getElementById("input-category-new");
  if (this.value === "") {
    newInput.style.display = "block";
  } else {
    newInput.style.display = "none";
  }
});

init();