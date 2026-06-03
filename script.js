import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-mdxGdr6LX9s3Y0NAEhISL-ahRJj4E_4",
  authDomain: "usaken-c7d17.firebaseapp.com",
  databaseURL: "https://usaken-c7d17-default-rtdb.firebaseio.com",
  projectId: "usaken-c7d17",
  storageBucket: "usaken-c7d17.firebasestorage.app",
  messagingSenderId: "140797691497",
  appId: "1:140797691497:web:1301c468c866c9cf9b44f8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  const now = new Date();
  const options = {year: "numeric", month: "long", day:"numeric", weekday: "long"};
  document.getElementById("today-date").textContent = now.toLocaleDateString("ja-JP",options);

 get(ref(db, "/")).then((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const today = new Date().toLocaleDateString("ja-JP");

      // 日付が今日と同じときだけ記録を読み込む
      if (data.log && data.savedDate === today) {
        log = data.log;
      } else {
        // 日付が違う → リセットして保存
        log = [];
        saveLog();
      }

      if (data.deletedItems) deletedItems = data.deletedItems;
      if (data.categories) {
        Object.keys(data.categories).forEach(key => {
          categories[key] = data.categories[key];
        });
        tabKeys.length = 0;
        Object.keys(categories).forEach(key => tabKeys.push(key));
      }
    }

    renderCategorySelect();
    renderTabs();
    renderMenu();
    renderLog();
    updateTotal();
  });
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

function quickAdd(){
  const kcal = Number(document.getElementById("quick-kcal").value);

  if(kcal <= 0){
    alert("カロリーを入力してください");
    return;
  }

  log.push({
    id: Date.now() + Math.random(),
    name: kcal + "kcal",
    kcal: kcal,
  });

  document.getElementById("quick-kcal").value = "";
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
  saveCategories();
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
    saveCategories();
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
    saveCategories();
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
  const today = new Date().toLocaleDateString("ja-JP");
  set(ref(db, "log"), log);
  set(ref(db, "savedDate"), today);  // ← 日付も保存
}

function saveDeleted(){
    set(ref(db, "deletedItems"), deletedItems);
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

function saveCategories(){
    set(ref(db, "categories"), categories);
}

document.getElementById("input-category-select").addEventListener("change", function() {
  const newInput = document.getElementById("input-category-new");
  if (this.value === "") {
    newInput.style.display = "block";
  } else {
    newInput.style.display = "none";
  }
});


window.clearAll = clearAll;
window.confirmClear = confirmClear;
window.cancelClear = cancelClear;
window.addMenu = addMenu;
window.toggleDeleteMode = toggleDeleteMode;
window.deleteTab = deleteTab;
window.removeItem = removeItem;
window.deleteMenuItem = deleteMenuItem;
window.restoreItem = restoreItem;
window.removeItem = removeItem;
window.quickAdd = quickAdd;

init();