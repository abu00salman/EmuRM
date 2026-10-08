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

/**
 * Tiny runtime polyfills for older Android System WebViews (still common on TVs and
 * budget phones, often Chrome 80-95). Only APIs the app actually uses are covered.
 */
export const COMPAT_SCRIPT = `(function(){try{
var A=Array.prototype;
if(!A.at)Object.defineProperty(A,"at",{value:function(n){n=Math.trunc(n)||0;if(n<0)n+=this.length;return this[n];},writable:true,configurable:true});
if(!String.prototype.replaceAll)Object.defineProperty(String.prototype,"replaceAll",{value:function(a,b){return a instanceof RegExp?this.replace(a,b):this.split(String(a)).join(b);},writable:true,configurable:true});
if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
var c=window.crypto;
if(c&&!c.randomUUID&&c.getRandomValues)c.randomUUID=function(){var b=new Uint8Array(16);c.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h=[].map.call(b,function(x){return(x+256).toString(16).slice(1);}).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);};
}catch(e){}})();`;
