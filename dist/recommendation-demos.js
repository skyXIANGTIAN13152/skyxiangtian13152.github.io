/** Small, local-only interaction examples. These never operate installed software. */
export const RECOMMENDATION_DEMOS = Object.freeze(['office-tool-plus','7-zip','sharex','super-productivity','hypomux','lx-music','mineradio-local','mineradio-original','thunderbird','libretv','winhance','bulk-crap-uninstaller','crystaldiskinfo','crystaldiskmark']);

export function renderRecommendationDemo(host,key,{language='zh',title=''}={}) {
  if(!host || !RECOMMENDATION_DEMOS.includes(key))return ()=>{};
  const doc=host.ownerDocument,controller=new (doc.defaultView?.AbortController||AbortController)();
  const t=(zh,en)=>language==='en'?en:zh;
  const node=(tag,className='',text)=>{const el=doc.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:controller.signal});
  const button=(text,fn,className='rd-button')=>{const el=node('button',className,text);el.type='button';on(el,'click',fn);return el;};
  const box=(label,value,fn)=>{const wrap=node('label','rd-check'),input=node('input');input.type='checkbox';input.checked=value;on(input,'change',()=>fn(input.checked));wrap.append(input,node('span','',label));return wrap;};
  const select=(label,values,fn)=>{const wrap=node('label','rd-select');wrap.append(node('span','',label));const input=node('select');for(const [value,text]of values){const option=node('option','',text);option.value=value;input.append(option);}on(input,'change',()=>fn(input.value));wrap.append(input);return wrap;};
  const root=node('div',`recommendation-demo rd-${key}`);root.dataset.languageContent='true';root.setAttribute('aria-label',t(`${title} 交互示例`,`${title} interactive example`));
  const bar=node('div','rd-titlebar');bar.append(node('strong','',title||key),node('span','rd-local-label',t('交互示例 · 演示数据','Interactive example · Sample data')));
  const body=node('div','rd-body');const feedback=node('p','rd-feedback',t('在示例窗口中试试操作。','Try the controls in this example.'));feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  root.append(bar,body,feedback);host.replaceChildren(root);
  const say=value=>{feedback.textContent=value;};
  const actions=(...buttons)=>{const row=node('div','rd-actions');row.append(...buttons);return row;};
  const heading=(zh,en)=>body.append(node('h4','',t(zh,en)));
  const inputText=(label,placeholder)=>{const input=node('input','rd-text-input');input.type='text';input.setAttribute('aria-label',label);input.placeholder=placeholder;input.maxLength=100;return input;};

  if(key==='office-tool-plus'){
    heading('配置 Office 应用','Configure Office apps');
    let edition='Microsoft 365',locale='zh-CN';const selected=new Set(['Word','Excel','PowerPoint']);
    const settings=node('div','rd-settings');settings.append(select(t('产品','Product'),[['Microsoft 365','Microsoft 365'],['Office LTSC','Office LTSC']],value=>{edition=value;}),select(t('语言','Language'),[['zh-CN','简体中文'],['en-US','English']],value=>{locale=value;}));
    const choices=node('div','rd-checks');for(const name of ['Word','Excel','PowerPoint','Outlook','OneNote'])choices.append(box(name,selected.has(name),checked=>checked?selected.add(name):selected.delete(name)));
    const output=node('div','rd-result',t('选择组件后，预览一份安装配置。','Choose apps, then preview an installation configuration.'));output.setAttribute('role','region');output.setAttribute('aria-label',t('示例配置','Example configuration'));
    body.append(settings,choices,actions(button(t('预览配置','Preview configuration'),()=>{output.textContent=selected.size?`${edition} · ${locale}\n${[...selected].join(' + ')}`:t('请至少选择一个应用。','Choose at least one app.');say(t('已生成配置示例，不会下载或安装 Office。','Configuration preview only. Office is not downloaded or installed.'));},'rd-button rd-primary')),output);
  }else if(key==='7-zip'){
    heading('建立压缩包','Create an archive');let format='7z';const files=[['notes.txt','12 KB'],['picture.png','240 KB'],['project.pdf','80 KB']],selected=new Set(files.map(([name])=>name));
    const list=node('div','rd-file-list');for(const [name,size]of files){const row=node('div','rd-file-row');row.append(box(name,true,checked=>checked?selected.add(name):selected.delete(name)),node('small','',size));list.append(row);}
    const archive=node('div','rd-result',t('示例文件，不读取本机文件。','Sample files; no files are read from your computer.'));
    body.append(list,actions(select(t('格式','Format'),[['7z','7z'],['zip','ZIP']],value=>{format=value;}),button(t('压缩示例文件','Archive sample files'),()=>{archive.textContent=selected.size?`${t('档案','Archive')}.${format} · ${selected.size} ${t('个示例文件','sample files')}`:t('请先选择文件。','Select files first.');say(t('这里只展示压缩流程，不生成真实压缩文件。','This illustrates the workflow without generating an archive.'));},'rd-button rd-primary')),archive);
  }else if(key==='sharex'){
    const preview=node('div','rd-capture');preview.append(node('span','rd-capture-caption',t('示例桌面','Sample desktop')),node('div','rd-capture-window',t('项目笔记\n需要截图分享的一段内容','Project notes\nA section to capture and share')));
    const region=node('div','rd-capture-region');region.hidden=true;preview.append(region);
    let picked=false,annotated=false;
    body.append(preview,actions(button(t('选择区域','Select region'),()=>{picked=true;region.hidden=false;say(t('已选择示例区域，可以添加标注。','Sample region selected. You can add an annotation.'));}),button(t('添加标注','Annotate'),()=>{if(!picked){say(t('先选择一个截图区域。','Select a capture region first.'));return;}annotated=!annotated;region.classList.toggle('annotated',annotated);region.textContent=annotated?t('重点','Note'):'';say(t('标注已更新。','Annotation updated.'));}),button(t('预览截图','Preview capture'),()=>{if(!picked){say(t('先选择一个截图区域。','Select a capture region first.'));return;}preview.classList.toggle('captured');say(t('已预览示例截图，不捕捉真实屏幕，也不上传。','Sample capture preview; your real screen is not captured or uploaded.'));},'rd-button rd-primary')));
  }else if(key==='super-productivity'){
    heading('今天的专注清单','Today’s focus list');
    const list=node('div','rd-task-list'),entry=inputText(t('添加示例任务','Add a sample task'),t('例如：整理一份项目笔记','For example: organize project notes'));
    let count=0,done=0;const progress=node('span','rd-progress');
    const update=()=>{progress.textContent=`${done} / ${count} ${t('已完成','done')}`;};
    function addTask(name){count++;const row=node('div','rd-task-row');row.append(box(name,false,checked=>{done+=checked?1:-1;row.classList.toggle('done',checked);update();}),button(t('专注','Focus'),()=>{say(t(`当前专注：${name} · 示例时段 25:00`,`Focus: ${name} · Sample session 25:00`));}));list.append(row);update();}
    addTask(t('整理项目资料','Organize project references'));addTask(t('阅读一章文档','Read a documentation chapter'));
    const add=()=>{const value=entry.value.trim();if(!value){say(t('先写下一个任务。','Enter a task first.'));return;}if(count>=8){say(t('示例最多添加八个任务。','This example supports up to eight tasks.'));return;}addTask(value);entry.value='';say(t('任务已加入这份示例清单。','Task added to this sample list.'));};on(entry,'keydown',event=>{if(event.key==='Enter'){event.preventDefault();add();}});
    body.append(list,actions(entry,button(t('添加','Add'),add,'rd-button rd-primary'),progress));
  }else if(key==='hypomux'){
    heading('查看多网卡分流','Explore multiple interfaces');const enabled={ethernet:true,wifi:true};const rows=node('div','rd-routes');
    const render=()=>{rows.replaceChildren();for(const [id,name]of [['ethernet',t('以太网','Ethernet')],['wifi','Wi-Fi']]){const row=node('div','rd-route');const channels=node('div','rd-route-dots');row.append(box(name,enabled[id],value=>{enabled[id]=value;channels.replaceChildren();}),channels);rows.append(row);}};render();
    body.append(rows,actions(button(t('分配示例连接','Distribute sample connections'),()=>{const active=Object.keys(enabled).filter(id=>enabled[id]);rows.querySelectorAll('.rd-route-dots').forEach(el=>el.replaceChildren());if(!active.length){say(t('至少开启一张网卡。','Enable at least one interface.'));return;}for(let i=0;i<6;i++){const target=active[i%active.length],index=target==='ethernet'?0:1;rows.children[index].lastChild.append(node('span','',String(i+1)));}say(t('六条示例连接已分配；这不是对单条下载速度的保证。','Six sample connections distributed; this does not guarantee a faster single download.'));},'rd-button rd-primary')));
  }else if(['lx-music','mineradio-local','mineradio-original'].includes(key)){
    const local=key==='mineradio-local',original=key==='mineradio-original';let selected=0,playing=false;
    const tracks=[t('雨夜 · 示例曲目','Rainy night · Sample track'),t('旧城 · 示例曲目','Old town · Sample track'),t('晨光 · 示例曲目','Morning light · Sample track')];
    const layout=node('div','rd-music-layout'),cover=node('div','rd-record-art','♪'),library=node('div','rd-music-library');
    const name=node('strong','rd-track-title');const list=node('div','rd-track-list');const progress=node('input','rd-seek');progress.type='range';progress.min='0';progress.max='180';progress.value='0';progress.setAttribute('aria-label',t('示例播放进度','Sample playback position'));
    const time=node('output','rd-time','0:00 / 3:00');on(progress,'input',()=>{const v=Number(progress.value);time.textContent=`${Math.floor(v/60)}:${String(v%60).padStart(2,'0')} / 3:00`;});
    const update=()=>{name.textContent=tracks[selected];list.querySelectorAll('button').forEach((el,i)=>el.setAttribute('aria-pressed',String(selected===i)));cover.classList.toggle('is-playing',playing);play.textContent=playing?t('暂停状态','Pause state'):t('播放状态','Play state');play.setAttribute('aria-pressed',String(playing));};
    tracks.forEach((track,i)=>list.append(button(track,()=>{selected=i;progress.value='0';time.textContent='0:00 / 3:00';update();say(t('已切换示例曲目。','Sample track changed.'));},'rd-track')));
    const play=button(t('播放状态','Play state'),()=>{playing=!playing;update();say(t('仅演示播放器状态，不播放音频。','Player state demonstration only; no audio is played.'));},'rd-button rd-primary');
    library.append(node('small','',local?t('本地音乐库','Local library'):original?t('歌单展架','Playlist shelf'):t('我的列表','My playlist')),name,list);layout.append(cover,library);
    body.append(layout,actions(play,button(t('下一首','Next track'),()=>{selected=(selected+1)%tracks.length;update();say(t('已选择下一首示例曲目。','Next sample track selected.'));}),progress,time));
    if(local)body.append(button(t('演示导入文件夹','Try importing a folder'),()=>{say(t('示例文件夹「我的音乐」已加入 · 3 首示例曲目。未访问真实文件。','Sample folder “My music” added · 3 sample tracks. No real files accessed.'));}));
    update();say(t('曲目、时长均为示例，不连接音乐服务。','Tracks and durations are samples. No music service is contacted.'));
  }else if(key==='thunderbird'){
    const inbox=node('div','rd-mail-layout'),list=node('div','rd-mail-list'),letter=node('article','rd-letter');
    const messages=[[t('项目讨论','Project discussion'),t('协作小组','Project team'),t('这是一封示例邮件。可以从左侧选择邮件，再试试归档流程。','This is a sample message. Select a message, then try archiving it.')],[t('周末安排','Weekend plans'),t('朋友','A friend'),t('这是一封用于展示阅读界面的示例邮件。','A sample message for demonstrating the reading pane.')]];let current=0;
    const display=()=>{const msg=messages[current];letter.replaceChildren(node('h4','',msg[0]),node('small','',t(`来自：${msg[1]}`,`From: ${msg[1]}`)),node('p','',msg[2]));};
    messages.forEach((msg,i)=>list.append(button(msg[0],()=>{current=i;display();},'rd-mail-item')));display();inbox.append(list,letter);
    body.append(inbox,actions(button(t('归档这封示例邮件','Archive sample message'),()=>{list.children[current].classList.add('archived');say(t(`「${messages[current][0]}」已归档（演示）。`,`“${messages[current][0]}” archived in this example.`));}),button(t('还原收件箱','Reset inbox'),()=>{list.querySelectorAll('button').forEach(el=>el.classList.remove('archived'));say(t('示例收件箱已还原。','Sample inbox reset.'));})));
  }else if(key==='libretv'){
    const search=inputText(t('示例影片搜索','Sample video search'),t('输入任意词体验搜索界面','Type a term to try the search interface'));const results=node('div','rd-video-results'),player=node('div','rd-video-player');player.hidden=true;
    body.append(actions(search,button(t('搜索示例','Search example'),()=>{const query=search.value.trim();if(!query){say(t('先输入一个搜索词。','Enter a search term first.'));return;}results.replaceChildren();player.hidden=true;for(let i=1;i<=3;i++)results.append(button(`${query} · ${t('示例','Sample')} ${i}`,()=>{player.hidden=false;player.textContent=`▷ ${query} · ${t('示例','Sample')} ${i}`;say(t('已打开播放器界面示例，不搜索或播放真实视频。','Sample player opened. No real videos are searched for or played.'));},'rd-video-card'));say(t('显示三条示例结果。','Showing three sample results.'));},'rd-button rd-primary')),results,player);say(t('使用本地演示数据，不接入影视来源。','Uses local sample data, with no video sources connected.'));
  }else if(key==='winhance'){
    heading('预览系统调整','Preview system settings');const chosen=new Set(),options=[t('隐藏任务栏搜索框','Hide taskbar search box'),t('显示文件扩展名','Show file extensions'),t('关闭建议内容','Turn off suggested content')];
    const list=node('div','rd-setting-list');options.forEach((name,i)=>list.append(box(name,false,value=>value?chosen.add(i):chosen.delete(i))));
    const preview=node('div','rd-system-preview');preview.append(node('span','rd-sample-file','Project'),node('div','rd-sample-taskbar',t('⊞   搜索   ▢','⊞   Search   ▢')));
    body.append(list,actions(button(t('预览选择的调整','Preview selected changes'),()=>{preview.firstChild.textContent=chosen.has(1)?'Project.txt':'Project';preview.lastChild.textContent=chosen.has(0)?'⊞   ▢':t('⊞   搜索   ▢','⊞   Search   ▢');say(t(`已预览 ${chosen.size} 项调整，不修改真实系统。`,`Previewing ${chosen.size} changes; your system is not modified.`));},'rd-button rd-primary')),preview);
  }else if(key==='bulk-crap-uninstaller'){
    heading('批量选择示例应用','Select sample apps');const list=node('div','rd-file-list'),selected=new Set();let cleaned=false;
    const names=['Sample Editor','Demo Player','Example Utility'];
    function draw(){list.replaceChildren();names.forEach((name,i)=>{const row=node('div','rd-file-row');row.append(box(name,selected.has(i),value=>value?selected.add(i):selected.delete(i)),node('small','',cleaned&&selected.has(i)?t('已移除（示例）','Removed (sample)'):t('示例应用','Sample app')));list.append(row);});}draw();
    body.append(list,actions(button(t('预览批量卸载','Preview bulk uninstall'),()=>{if(!selected.size){say(t('先勾选一个示例应用。','Select a sample app first.'));return;}cleaned=true;draw();say(t(`示例中已移除 ${selected.size} 个应用；不会卸载本机软件。`,`Removed ${selected.size} apps in this example; installed software is untouched.`));},'rd-button rd-primary'),button(t('重置','Reset'),()=>{selected.clear();cleaned=false;draw();say(t('示例列表已重置。','Sample list reset.'));})));
  }else if(key==='crystaldiskinfo'){
    const stats=node('div','rd-disk-stats'),table=node('div','rd-smart');
    const show=value=>{stats.replaceChildren();table.replaceChildren();const ssd=value==='ssd';stats.append(node('div','rd-health',t('良好','Good')),node('div','rd-temperature',ssd?'34 °C':'39 °C'),node('strong','',ssd?'Sample SSD 1 TB':'Sample HDD 2 TB'));[[t('通电时间','Power-on hours'),ssd?'1,200 h':'3,600 h'],[t('通电次数','Power-on count'),ssd?'280':'650'],[t('重新分配扇区','Reallocated sectors'),'0']].forEach(([name,number])=>{const row=node('div','rd-smart-row');row.append(node('span','',name),node('strong','',number));table.append(row);});};
    body.append(actions(select(t('示例硬盘','Sample drive'),[['ssd','Sample SSD'],['hdd','Sample HDD']],value=>{show(value);say(t('已切换示例设备，数据不来自这台电脑。','Sample drive changed. Data does not come from this computer.'));})),stats,table);show('ssd');say(t('所有温度与健康数据均为示例。','All temperatures and health data are samples.'));
  }else if(key==='crystaldiskmark'){
    let size='1 GiB';const table=node('table','rd-benchmark');const head=node('tr');for(const text of ['',t('读取 MB/s','Read MB/s'),t('写入 MB/s','Write MB/s')])head.append(node('th','',text));table.append(head);const cells=[];
    ['SEQ1M Q8T1','SEQ1M Q1T1','RND4K Q32T1','RND4K Q1T1'].forEach(label=>{const row=node('tr');row.append(node('th','',label));const a=node('td','','—'),b=node('td','','—');cells.push([a,b]);row.append(a,b);table.append(row);});
    body.append(actions(select(t('示例测试大小','Sample test size'),[['1 GiB','1 GiB'],['4 GiB','4 GiB']],value=>{size=value;}),button(t('显示示例结果','Show sample results'),()=>{const data=[[3500,2800],[2100,1800],[640,520],[48,130]];cells.forEach((pair,i)=>pair.forEach((cell,j)=>{cell.textContent=String(data[i][j]);cell.classList.add('has-result');}));say(t(`${size} · 固定演示结果，不测试本机硬盘性能。`,`${size} · Fixed sample results; your storage performance is not tested.`));},'rd-button rd-primary')),table);say(t('此处是读写测试的界面示例，不运行基准测试。','An interface example only; no benchmark is run.'));
  }
  return ()=>{controller.abort();root.remove();};
}
