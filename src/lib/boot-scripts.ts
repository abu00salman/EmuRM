/**
 * Blocking snippets inlined in <head> by the root layout. They live in this plain
 * (server-safe) module on purpose: exporting them from a "use client" module turns
 * them into client references, and the layout would inline a throwing stub instead
 * of the script text.
 */

/** Sets lang/dir before first paint so returning RTL visitors never see an LTR flash. */
export const LOCALE_INIT_SCRIPT = `(function(){try{var k="emurm:locale";var v=localStorage.getItem(k);if(v!=="en"&&v!=="ar"){v=(navigator.language||"").toLowerCase().indexOf("ar")===0?"ar":"en";}document.documentElement.lang=v;document.documentElement.dir=v==="ar"?"rtl":"ltr";}catch(e){}})();`;

/** Sets the theme before first paint so a light-theme visitor never sees a dark flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem("emurm:theme");if(v!=="light")v="dark";var r=document.documentElement;r.dataset.theme=v;r.style.colorScheme=v;}catch(e){}})();`;
