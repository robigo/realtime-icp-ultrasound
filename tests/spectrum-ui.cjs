const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const elements=new Map();
const ctx=new Proxy({}, {get:(obj,key)=>obj[key]||(()=>{}),set:(obj,key,value)=>(obj[key]=value,true)});
function element(id){
  if(!elements.has(id)) elements.set(id,{value:({signal:'icp_proxy_z',segment:'all',window:'hann'})[id],textContent:'',hidden:false,disabled:false,listeners:{},selectedOptions:[{textContent:'test synthetic signal'}],
    addEventListener(type,fn){this.listeners[type]=fn;},getBoundingClientRect(){return{width:700,height:360};},getContext(){return ctx;},setAttribute(){},append(){},click(){if(this.listeners.click)this.listeners.click();},remove(){}});
  return elements.get(id);
}
let exported;
const sandbox={console,Blob,URL:{createObjectURL(blob){exported=blob;return'blob:test';},revokeObjectURL(){}},setTimeout(fn){fn();},SpectrumCore:require('../spectrum-core.js'),window:{devicePixelRatio:1,addEventListener(){}},document:{getElementById:element,createElement:()=>element('download-link'),body:{append(){}}}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'spectrum.js'),'utf8'),sandbox);
assert.equal(element('count').textContent,600);
assert.equal(element('fs').textContent,'50.0');
element('baseline').click();assert.equal(element('baselineLegend').hidden,false);
function select(id,value){element(id).value=value;element(id).listeners.change();}
select('segment','last');assert.equal(element('count').textContent,300);
select('signal','ppg_reference_0_1');assert.equal(element('baselineLegend').hidden,true);
select('window','rectangular');element('export').click();
(async()=>{const csv=await exported.text();assert.ok(csv.includes('synthetic_demo,ppg_reference_0_1,last,rectangular'));assert.equal(csv.trim().split('\n').length,151);
element('clear').click();assert.equal(element('clear').disabled,true);assert.equal(element('error').textContent,'');
console.log('PASS: DOM integration, selection, baseline visibility and CSV metadata');})().catch(e=>{console.error(e);process.exitCode=1;});
