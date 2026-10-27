import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const css=readFileSync('src/design-system/theme.css','utf8');
const palette:Record<string,string>=Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(m=>[m[1],m[2]]));
function lum(s:string){return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((n,c,i)=>n+c*([.2126,.7152,.0722][i]??0),0);}
function ratio(a:string,b:string){const x=lum(palette[a]??''),y=lum(palette[b]??'');return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
describe('Brambly exact palette and AA',()=>{
 it('uses exact d16 values',()=>expect(palette).toMatchObject({forest:'#173F35',black:'#111111',canvas:'#F4F0E7',white:'#FFFFFF',ink:'#15231F',line:'#DCE3DF','muted-text':'#66736F','muted-strong':'#5A6A66',field:'#F7F8F7','card-border':'#E2E7E4','forest-tint':'#E7F0EC',destructive:'#C23B30',warning:'#B86E00'}));
 for(const [fg,bg] of [['white','forest'],['forest','canvas'],['ink','canvas'],['ink','white'],['muted-text','white'],['muted-strong','canvas'],['destructive','white'],['destructive','canvas'],['sidebar-idle','forest'],['sidebar-secondary','forest'],['forest','forest-tint'],['white','black']])it(`${fg} on ${bg} passes normal text AA`,()=>expect(ratio(fg??'',bg??'')).toBeGreaterThanOrEqual(4.5));
 it('rejects the unsafe secondary and warning text pairs',()=>{for(const [a,b] of [['muted-text','canvas'],['warning','white'],['warning','canvas']])expect(ratio(a??'',b??'')).toBeLessThan(4.5);expect(ratio('focus-inverse','forest')).toBeGreaterThanOrEqual(3);});
});
