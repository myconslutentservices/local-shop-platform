/* Shared Master Panel navigation shell. It only changes presentation and links. */
(function(){
  if(document.body.classList.contains("mp-shell-ready")) return;
  var path=(location.pathname.split("/").pop()||"dashboard.html").toLowerCase();
  if(path==="login.html") return;
  document.body.classList.add("master-shell","mp-shell-ready");
  var items=[
    ["dashboard.html","▦","Dashboard"],
    ["shops.html","▤","Shops"],
    ["owners.html","♙","Owners"],
    ["all-products.html","◇","Products"],
    ["all-orders.html","⇄","Orders"],
    ["revenue.html","↗","Revenue & Reports"],
    ["support.html","◉","Support"],
    ["website-status.html","⌁","Website Status"],
    ["notifications.html","♧","Notifications"],
    ["business-categories.html","▦","Categories"],
    ["settings.html","⚙","Settings"]
  ];
  var sidebar=document.createElement("aside");
  sidebar.className="mp-sidebar";
  sidebar.setAttribute("aria-label","Master panel navigation");
  sidebar.innerHTML='<a class="mp-brand" href="dashboard.html"><span class="mp-brand-mark">M</span><span class="mp-brand-copy"><strong>Master Console</strong><span>Platform control center</span></span></a><div class="mp-nav-label">Workspace</div><nav class="mp-nav" aria-label="Main navigation"></nav><div class="mp-sidebar-bottom"><strong>✦ Platform overview</strong><span>Manage shops, owners, orders and platform settings from one place.</span></div>';
  var nav=sidebar.querySelector(".mp-nav");
  items.forEach(function(item){
    var a=document.createElement("a");
    a.href=item[0];a.innerHTML='<span class="mp-nav-icon" aria-hidden="true">'+item[1]+'</span><span>'+item[2]+'</span>';
    if(path===item[0]){a.setAttribute("aria-current","page");a.setAttribute("aria-label",item[2]+" (current page)");}
    nav.appendChild(a);
  });
  var toggle=document.createElement("button");
  toggle.className="mp-mobile-toggle";toggle.type="button";toggle.setAttribute("aria-label","Open navigation");toggle.setAttribute("aria-expanded","false");toggle.innerHTML="☰";
  var overlay=document.createElement("div");overlay.className="mp-overlay";overlay.setAttribute("aria-hidden","true");
  function closeNav(){document.body.classList.remove("mp-nav-open");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Open navigation");toggle.innerHTML="☰";}
  function openNav(){document.body.classList.add("mp-nav-open");toggle.setAttribute("aria-expanded","true");toggle.setAttribute("aria-label","Close navigation");toggle.innerHTML="×";}
  toggle.addEventListener("click",function(){document.body.classList.contains("mp-nav-open")?closeNav():openNav();});
  overlay.addEventListener("click",closeNav);
  sidebar.addEventListener("click",function(e){if(e.target.closest("a"))closeNav();});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeNav();});
  document.body.insertBefore(overlay,document.body.firstChild);
  document.body.insertBefore(sidebar,document.body.firstChild);
  document.body.appendChild(toggle);
})();