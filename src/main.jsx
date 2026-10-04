import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {Button} from '@astryxdesign/core/Button';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@fontsource-variable/manrope';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import './style.css';
import Booking from './Booking';
import LeadForm from './LeadForm';
import Training from './Training';
import Admin from './Admin';
import {api,money,cost,minutes} from './api';
import './extension.css';

// Вкладки сайта. Адрес вида #/services работает на любом хостинге без правил перезаписи.
// «Главная» открывается по логотипу и в верхнее меню не входит.
const pages=[['home','Главная'],['services','Услуги и комплексы'],['booking','Запись'],['reviews','Отзывы'],['about','О нас'],['training','Обучение'],['contacts','Контакты']];
// Прежние адреса вкладок и якоря одностраничной версии ведут туда, где теперь лежит раздел.
const aliases={prices:'services'};
const legacy={directions:'home',prices:'services',request:'booking',lead:'booking',reviews:'reviews',about:'about',team:'about',works:'about',training:'training',contacts:'contacts'};
const href=id=>id==='home'?'#/':'#/'+id;
const booking=href('booking');
const baseTitle='Эмблика — время для себя · Брянск';
function readPage(){
 const h=location.hash.slice(1);
 if(h.startsWith('/')){const id=aliases[h.slice(1)]||h.slice(1);return pages.some(([p])=>p===id)?id:'home';}
 return h?legacy[h]||null:'home';
}
const maps='https://yandex.ru/maps/org/emblika/145016511707/';
const mapWidget='https://yandex.ru/map-widget/v1/org/emblika/145016511707/';
const phones=[{href:'tel:+79964474306',label:'+7 (996) 447-43-06'},{href:'tel:+79102973661',label:'+7 (910) 297-36-61'}];
const phone=phones[0];
// Ссылки — из открытой карточки студии на DIKIDI. Сервисы Meta со страниц убираем (скилл russian_site).
const socials=[['Telegram','https://t.me/Emblicabeautybar'],['ВКонтакте','https://vk.com/emblica']];
// Куда написать. Ссылку на MAX пришлёт студия: пока её нет, пункт не выводится.
const messengers=[['ВКонтакте','https://vk.me/emblica','сообщения сообщества'],['MAX','','мессенджер'],['Telegram','https://t.me/Emblicabeautybar','']].filter(([,url])=>url);
const hours='Ежедневно, 10:00–20:00';
// Категории совпадают с полем category в таблице services.
const directions=[
 {category:'Ногти',title:'Маникюр и педикюр',image:'work-1',text:'Маникюр, педикюр, покрытие гель-лаком, наращивание и СПА-уход.'},
 {category:'Ресницы и брови',title:'Ресницы и брови',image:'work-2',text:'Классическое и LED-наращивание, ламинирование ресниц и бровей.'},
 {category:'Эстетическая косметология',title:'Косметология',image:'room',text:'Чистки, пилинги, массаж и RF-лифтинг лица.'},
 {category:'Волосы',title:'Волосы',image:'studio',text:'Стрижки, окрашивание, завивка, укладки и уход за волосами.'},
 {category:'Коррекция фигуры',title:'Коррекция фигуры',image:'detail',text:'Аппаратные процедуры по зонам. Первая консультация — бесплатно.'}
];
const bodyCategory='Коррекция фигуры';
// Эти разделы показываются карточками в блоке «Комплексы и спецпредложения», а не строками прайса.
const offerCategories=['Комплексы','Спецпредложения'];
const perks=[
 ['Без скрытых доплат','Стоимость мастер называет до начала процедуры. Всё, что может повлиять на цену, обсуждаем заранее — без сюрпризов в конце.'],
 ['Подарочные сертификаты','Подарите близким время для себя. Номинал и условия сертификата подскажет администратор.','Узнать о сертификатах'],
 ['Кэшбэк 3%','С чека от 1000 ₽ возвращаем 3% — ими можно воспользоваться при следующем визите в студию.']
];
const giftTopic='Подарочный сертификат';
const values=[
 ['Забота без спешки','Длительность процедуры известна заранее — время рассчитано так, чтобы мастеру не приходилось торопиться.'],
 ['Стоимость до визита','Прайс открыт на сайте, а скрытых доплат нет: итоговую цену мастер называет до начала работы.'],
 ['Внимание к деталям','Форму, оттенок и привычный уход обсуждаем до начала работы, а не по ходу.'],
 ['Растим мастеров','На базе студии проходит обучение — делимся опытом с теми, кто только начинает путь в профессии.']
];
const team=[
 {id:1,name:'Полина',role:'Косметолог, лешмейкер, бровист',image:'polina',text:'Косметолог с медицинским образованием: подбирает процедуры и домашний уход, делает массаж лица. В наращивании ресниц — четыре года, работает и в LED-технике.',category:'Эстетическая косметология'},
 {id:2,name:'Анна',role:'Мастер маникюра и педикюра',image:'anna',text:'Уход за ногтями, покрытие и наращивание. Сдержанный нюд, яркий цвет или новая форма — начните с ваших пожеланий.',category:'Ногти'},
 {id:3,name:'Мария',role:'Парикмахер',image:'maria',text:'Женские, мужские и детские стрижки, окрашивание и завивка. Обсудите длину, оттенок и то, как вы привыкли укладывать волосы.',category:'Волосы'}
];
const photos=[
 ['work-1','Маникюр в натуральном оттенке','tall'],
 ['detail','Рабочее место мастера',''],
 ['work-2','Оформление бровей: до и после',''],
 ['room','Кабинет ухода за лицом','tall'],
 ['work-3','Аккуратная форма и естественное покрытие',''],
 ['studio','Зал студии','']
];
const faq=[
 ['Как работает запись на сайте?','Выберите услугу, мастера, дату и свободное время. После отправки запись появится в кабинете студии, а выбранное окно станет недоступным другим посетителям. Сейчас сайт работает в тестовом режиме: реальный визит не бронируется.'],
 ['Не знаю, какую услугу выбрать. Что делать?','Оставьте заявку «Подберём процедуру» на вкладке «Запись» или позвоните по номеру +7 (996) 447-43-06. Особенно полезно заранее обсудить окрашивание, косметологию и сложный дизайн ногтей.'],
 ['Цена на сайте окончательная?','Цены в прайсе — ориентир: итог зависит от процедуры, длины волос или ногтей, дизайна и дополнительных услуг. Скрытых доплат нет — окончательную стоимость мастер называет до начала работы. Сейчас цены на сайте демонстрационные.'],
 ['Есть ли подарочные сертификаты?','Да. Номинал и условия уточните у администратора по телефону или оставьте заявку на вкладке «Запись».'],
 ['Как работает кэшбэк?','С чека от 1000 ₽ студия возвращает 3%. Воспользоваться ими можно при следующем визите в «Эмблику».'],
 ['Можно ли прийти на несколько процедур?','Да, в студии несколько направлений. На сайте создайте отдельную запись на каждую процедуру, а последовательность обсудите со студией.'],
 ['Как попасть на обучение?','Есть офлайн-обучение с нуля в студии и онлайн-программа для практикующих мастеров. Выберите формат на вкладке «Обучение» и оставьте заявку — администратор расскажет о программе, датах и стоимости.'],
 ['Как изменить или отменить запись?','В тестовой версии администратор отменяет запись в кабинете — время снова появляется в расписании. Реальные договорённости о визите меняются напрямую со студией по телефону.']
];
const explore=[
 ['about','О нас','Пространство, ценности, мастера и фотографии работ.'],
 ['reviews','Отзывы','Что говорят гости — прямо из карточки студии на Яндекс Картах.'],
 ['training','Обучение','Офлайн-курсы с нуля и онлайн-программа для мастеров.'],
 ['contacts','Контакты','Адрес, часы работы, карта и ответы на вопросы перед визитом.']
];
const Arrow=()=> <span aria-hidden="true">↗</span>;
const duration=s=>s.mode==='request'&&s.price==null?'по консультации':'≈ '+minutes(s.duration);

function Perks({onGift}){
 return <div className="perks">{perks.map(([title,text,action])=><div className="perk" key={title}><strong>{title}</strong><p>{text}</p>{action&&<button className="text-link" onClick={onGift}>{action} →</button>}</div>)}</div>;
}

function App(){
 const [menu,setMenu]=useState(false),[catalog,setCatalog]=useState(null),[selected,setSelected]=useState(''),[loadError,setLoadError]=useState('');
 const [category,setCategory]=useState('all'),[search,setSearch]=useState('');
 const [external,setExternal]=useState(()=>{try{return localStorage.getItem('emblika-external');}catch{return null;}});
 const [cookieOpen,setCookieOpen]=useState(!external),[gallery,setGallery]=useState(null);
 const [page,setPage]=useState(()=>readPage()||'home');
 // Направление, подставляемое в форму заявки: {type, topic, n}.
 const [preset,setPreset]=useState(null);
 const first=useRef(true);
 function allow(value){setExternal(value);setCookieOpen(false);try{localStorage.setItem('emblika-external',value);}catch{}}
 useEffect(()=>{api('catalog').then(r=>{
  // Порядок прайса и формы записи — как у направлений на главной; комплексы и курсы — в конце.
  const rank=c=>{const i=directions.findIndex(d=>d.category===c);return i>=0?i:offerCategories.includes(c)?100+offerCategories.indexOf(c):50;};
  setCatalog({...r,services:[...r.services].sort((a,b)=>rank(a.category)-rank(b.category)||a.id-b.id)});
 }).catch(e=>setLoadError(e.message));},[]);
 useEffect(()=>{if(!gallery)return;const dialog=document.getElementById('photo-dialog');dialog?.showModal();return()=>dialog?.close();},[gallery]);
 useEffect(()=>{
  // Старый якорь или прежний адрес заменяем адресом вкладки, чтобы кнопка «Назад» работала предсказуемо.
  // Прочие якоря без «/» (например, ссылка «Перейти к содержимому») вкладку не меняют.
  const sync=()=>{
   const h=location.hash.slice(1);
   if(h&&!h.startsWith('/')&&legacy[h])history.replaceState(null,'',href(legacy[h]));
   else if(h.startsWith('/')&&aliases[h.slice(1)])history.replaceState(null,'',href(aliases[h.slice(1)]));
   const next=readPage();if(next)setPage(next);
  };
  sync();addEventListener('hashchange',sync);return()=>removeEventListener('hashchange',sync);
 },[]);
 useEffect(()=>{
  const label=pages.find(([id])=>id===page)[1];
  document.title=page==='home'?baseTitle:label+' — Эмблика';
  if(first.current){first.current=false;return;}
  scrollTo(0,0);setMenu(false);
  // Переносим фокус в начало вкладки, чтобы экранный диктор прочитал новое содержимое.
  document.getElementById('main')?.focus({preventScroll:true});
 },[page]);
 function go(id){if(page===id)scrollTo(0,0);else location.hash=href(id);}
 function choose(id){setSelected(String(id));go('booking');}
 function showPrices(cat){setCategory(cat);setSearch('');go('services');}
 // Открывает нужную форму заявки с выбранным направлением.
 function requestLead(type,topic){
  setPreset({type,topic,n:Date.now()});
  const target={client:'booking',body:'services',training:'training'}[type];
  if(page!==target)location.hash=href(target);
 }
 const ask=s=>requestLead(s.category===bodyCategory?'body':'client',s.name);
 const all=catalog?.services||[];
 const fromPrice=cat=>{const list=all.filter(s=>s.category===cat&&Number(s.price)>0).map(s=>Number(s.price));return list.length?'от '+money(Math.min(...list)):'Цена по согласованию';};
 const priced=all.filter(s=>!offerCategories.includes(s.category));
 const offers=all.filter(s=>offerCategories.includes(s.category));
 // Порядок фильтров: сначала направления студии, затем разделы, добавленные в кабинете.
 const categories=[...directions.map(d=>d.category),...new Set(priced.map(s=>s.category))].filter((c,i,a)=>a.indexOf(c)===i&&priced.some(s=>s.category===c));
 const services=useMemo(()=>{
  const q=search.trim().toLowerCase();
  return priced.filter(s=>(category==='all'||s.category===category)&&(!q||`${s.name} ${s.description} ${s.category}`.toLowerCase().includes(q)));
 },[catalog,category,search]);
 const withPhotos=services.some(s=>s.image);
 const clientTopics=[...new Set(['Помочь выбрать услугу',...directions.filter(d=>d.category!==bodyCategory).map(d=>d.title),giftTopic,...priced.filter(s=>s.mode==='request'&&s.category!==bodyCategory).map(s=>s.name)])];
 const bodyTopics=['Бесплатная консультация','Живот и бока','Ноги','Ягодицы','Ягодицы и ноги','Спина','Курс из нескольких зон'];
 const presetFor=type=>preset?.type===type?preset:null;
 const nav=pages.filter(([id])=>id!=='home');
 const navLink=([id,label])=><a key={id} href={href(id)} aria-current={page===id?'page':undefined} onClick={()=>setMenu(false)}>{label}</a>;
 const openPhoto=(src,title)=>setGallery({src,title});
 const bookButton=s=>s.mode==='request'
  ?<button className="price-book" onClick={()=>ask(s)} aria-label={'Оставить заявку: '+s.name}>Оставить заявку</button>
  :<button className="price-book" onClick={()=>choose(s.id)} aria-label={'Записаться: '+s.name}>Записаться</button>;
 const writeUs=<div className="lead-contacts">{phones.map(p=><a key={p.href} href={p.href}>{p.label}</a>)}{messengers.map(([n,u])=><a key={n} href={u} target="_blank" rel="noopener noreferrer">{n} ↗</a>)}</div>;

 return <>
 <a className="skip" href="#main">Перейти к содержимому</a>
 <div className="demo-top"><span>Демонстрационная версия нового сайта</span><a href={booking}>Попробовать запись ↗</a></div>
 <header className="header">
  <a className="logo" href="#/" aria-label="Эмблика — главная">эмблика<span>СТУДИЯ КРАСОТЫ</span></a>
  <nav className={menu?'nav open':'nav'} aria-label="Основная навигация">{nav.map(navLink)}</nav>
  <a className="header-phone" href={phone.href}>{phone.label}</a>
  <Button className="button small" label="Записаться" href={booking}/>
  <button className="menu-toggle" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-label={menu?'Закрыть меню':'Открыть меню'}><span/><span/></button>
 </header>

 <main id="main" tabIndex={-1}>
  {page==='home'&&<>
  <section className="hero">
   <div className="hero-copy">
    <div className="eyebrow"><span className="line"/>СТУДИЯ КРАСОТЫ В БРЯНСКЕ · БЕЖИЦА</div>
    <h1>Красота,<br/>которая <em>растёт<br/>из заботы.</em></h1>
    <p>Ногти, ресницы и брови, косметология, волосы и коррекция фигуры — в одной спокойной студии. Выберите услугу, посмотрите цену и запишитесь онлайн за пару минут.</p>
    <div className="hero-actions"><Button className="button" label="Записаться онлайн" href={booking} endContent={<Arrow/>}/><a className="button ghost" href={href('services')}>Смотреть услуги и цены</a></div>
    <ul className="hero-facts"><li><strong>5</strong><span>направлений<br/>в одной студии</span></li><li><strong>3</strong><span>мастера<br/>в команде</span></li><li><strong>10–20</strong><span>ежедневно<br/>по записи</span></li></ul>
   </div>
   <div className="hero-visual team">
    <div className="hero-main"><img src="/assets/team.jpg" alt="Команда студии красоты «Эмблика»" width="853" height="582" fetchPriority="high"/></div>
    <a className="hero-badge" href={href('contacts')}><span className="dot"/>{hours}<small>ул. Брянской Пролетарской Дивизии, 30А</small></a>
   </div>
  </section>

  <section className="section directions" id="directions" aria-labelledby="directions-title">
   <div className="section-head"><div><div className="eyebrow">НАПРАВЛЕНИЯ</div><h2 id="directions-title">Что сделаем <em>для вас?</em></h2></div><p>Выберите направление — покажем процедуры и цены.</p></div>
   <div className="direction-grid">{directions.map(d=><button className="direction-card" key={d.category} onClick={()=>showPrices(d.category)}>
    <span className="direction-photo"><img src={'/assets/'+d.image+'.jpg'} alt="" loading="lazy"/></span>
    <span className="direction-body"><strong>{d.title}</strong><small>{d.text}</small><span className="direction-price">{catalog?fromPrice(d.category):'…'}<i aria-hidden="true">→</i></span></span>
   </button>)}</div>
  </section>

  <section className="section perks-section" aria-labelledby="perks-title">
   <div className="section-head"><div><div className="eyebrow">ЧЕСТНО И ВЫГОДНО</div><h2 id="perks-title">Приятно <em>возвращаться</em></h2></div></div>
   <Perks onGift={()=>requestLead('client',giftTopic)}/>
  </section>

  <section className="section explore" aria-labelledby="explore-title">
   <div className="section-head"><div><div className="eyebrow">НА САЙТЕ</div><h2 id="explore-title">Что ещё <em>посмотреть?</em></h2></div></div>
   <div className="explore-grid">{explore.map(([id,title,text])=><a className="explore-card" key={id} href={href(id)}><strong>{title}</strong><small>{text}</small><i aria-hidden="true">→</i></a>)}</div>
  </section>
  </>}

  {page==='services'&&<>
  <section className="section prices" id="services" aria-labelledby="services-title">
   <div className="section-head"><div><div className="eyebrow">УСЛУГИ И КОМПЛЕКСЫ</div><h2 id="services-title">Услуги <em>и цены</em></h2></div><p>Все процедуры студии. Выберите услугу — и сразу запишитесь онлайн или оставьте заявку.</p></div>
   <Perks onGift={()=>requestLead('client',giftTopic)}/>
   <div className="price-tools">
    <label className="price-search"><span className="sr-only">Поиск услуги</span><input type="search" placeholder="Поиск: маникюр, чистка, стрижка…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="chips" role="group" aria-label="Направление">{[['all','Все услуги'],...categories.map(c=>[c,directions.find(d=>d.category===c)?.title||c])].map(([id,label])=><button key={id} aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</div>
   </div>
   <div className={withPhotos?'price-table with-photos':'price-table'} aria-live="polite">{!catalog?<p className="price-empty">{loadError||'Загружаем услуги…'}</p>:services.length?services.map(s=><div className="price-row" key={s.id}>
    {withPhotos&&(s.image?<button className="price-photo" onClick={()=>openPhoto(s.image,s.name)} aria-label={'Фото: '+s.name}><img src={s.image} alt="" loading="lazy"/></button>:<span className="price-photo empty" aria-hidden="true"/>)}
    <div className="price-name"><span className="price-cat">{s.category}</span><strong>{s.name}</strong><small>{s.description}</small></div>
    <span className="price-duration">{duration(s)}</span>
    <span className="price-value">{cost(s)}</span>
    {bookButton(s)}
   </div>):<p className="price-empty">Ничего не нашли. Попробуйте другое слово или <button className="inline-link" onClick={()=>requestLead('client','Помочь выбрать услугу')}>оставьте заявку</button> — подберём процедуру.</p>}</div>
   <p className="fine">Цены — ориентиры для демонстрации. Скрытых доплат нет: итоговую стоимость и длительность мастер называет до начала процедуры.</p>
  </section>

  <section className="section offers" aria-labelledby="offers-title">
   <div className="section-head"><div><div className="eyebrow">КОМПЛЕКСЫ И СПЕЦПРЕДЛОЖЕНИЯ</div><h2 id="offers-title">Выгоднее <em>вместе</em></h2></div><p>Сочетания процедур за один визит и курсы, в которых сеанс обходится дешевле.</p></div>
   {offers.length?offerCategories.filter(c=>offers.some(s=>s.category===c)).map(c=><div className="offer-group" key={c}><h3>{c==='Комплексы'?'Комплексы — несколько процедур за визит':'Спецпредложения — курсы по выгодной цене'}</h3><div className="offer-grid">{offers.filter(s=>s.category===c).map(s=><article className="offer-card" key={s.id}>
    {s.image&&<button className="offer-photo" onClick={()=>openPhoto(s.image,s.name)} aria-label={'Фото: '+s.name}><img src={s.image} alt="" loading="lazy"/></button>}
    <div><h4>{s.name}</h4>{s.description&&<p>{s.description}</p>}</div>
    <div className="offer-foot"><span className="price-value">{cost(s)}</span><span className="price-duration">{duration(s)}</span>{bookButton(s)}</div>
   </article>)}</div></div>):<div className="offer-empty"><h3>Комплексы и акции скоро появятся здесь</h3><p>О действующих предложениях расскажет администратор.</p>{writeUs}</div>}
  </section>

  <section className="section lead body-lead" id="body" aria-labelledby="body-title">
   <div className="lead-copy"><div className="eyebrow">АППАРАТНАЯ КОРРЕКЦИЯ ФИГУРЫ</div><h2 id="body-title">Коррекция фигуры<br/><em>по заявке</em></h2><p>Оставьте заявку — администратор перезвонит, расскажет о процедурах и подберёт удобное время для консультации.</p><ul className="body-points"><li>Первая консультация — бесплатно</li><li>Разовые сеансы и курсы из 5, 8 и 10 процедур: в курсе сеанс обходится дешевле</li><li>Стоимость известна заранее, без скрытых доплат</li></ul></div>
   <LeadForm catalog={catalog} loadError={loadError} type="body" topics={bodyTopics} preset={presetFor('body')} title="Заявка на коррекцию фигуры" caption="Перезвоним в рабочее время студии" submitLabel="Жду звонка" commentHint="Какой результат хотите получить, удобное время для звонка"/>
  </section>
  </>}

  {page==='booking'&&<>
  <Booking catalog={catalog} selected={selected} setSelected={setSelected} loadError={loadError}/>

  <section className="section lead" id="lead" aria-labelledby="lead-title">
   <div className="lead-copy"><div className="eyebrow">ПОДБЕРЁМ ПРОЦЕДУРУ</div><h2 id="lead-title">Не знаете,<br/><em>что выбрать?</em></h2><p>Оставьте заявку — администратор перезвонит, поможет подобрать процедуру и мастера и предложит удобное время. Также можно спросить о подарочном сертификате.</p>{writeUs}</div>
   <LeadForm catalog={catalog} loadError={loadError} type="client" topics={clientTopics} preset={presetFor('client')} title="Заявка на консультацию" caption="Ответим в рабочее время студии" submitLabel="Жду звонка"/>
  </section>
  </>}

  {page==='reviews'&&<section className="reviews section" id="reviews" aria-labelledby="reviews-title">
   <div className="review-story"><div className="eyebrow">ОТЗЫВЫ</div><h2 id="reviews-title">Знакомство<br/><em>через впечатления.</em></h2><p>Отзывы помогают почувствовать атмосферу студии ещё до первого визита. Здесь — виджет карточки «Эмблики» на Яндекс Картах: новые отзывы появляются в нём сами.</p><div className="review-links"><a href={maps+'reviews/'} target="_blank" rel="noopener noreferrer" className="text-link">Открыть все отзывы <Arrow/></a><a href={maps+'reviews/'} target="_blank" rel="noopener noreferrer" className="text-link">Оставить отзыв на Яндекс Картах <Arrow/></a></div></div>
   <div className="review-widget">{external==='accepted'?<iframe src="https://yandex.ru/maps-reviews-widget/145016511707?comments" title="Отзывы о студии Эмблика на Яндекс Картах" loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>:<div className="review-placeholder"><span className="review-symbol">“</span><h3>Гости — о студии</h3><p>Чтобы показать актуальные отзывы, нужно загрузить виджет Яндекса. Сервис получит технические данные вашего браузера.</p><Button className="button" label="Загрузить отзывы Яндекса" onClick={()=>allow('accepted')}/></div>}</div>
  </section>}

  {page==='about'&&<>
  <section className="section about" id="about" aria-labelledby="about-title">
   <div className="about-photos"><img className="about-a" src="/assets/studio.jpg" alt="Зал студии Эмблика" loading="lazy"/><img className="about-b" src="/assets/room.jpg" alt="Кабинет ухода за лицом" loading="lazy"/></div>
   <div className="about-copy">
    <div className="eyebrow">О НАС</div>
    <h2 id="about-title">Место, где можно<br/><em>выдохнуть.</em></h2>
    <p>«Эмблика» — студия красоты в Бежицком районе Брянска. Светлые залы, зелень и спокойный ритм: здесь не нужно торопиться, можно просто побыть немного для себя.</p>
    <p>Под одной крышей — ногтевой сервис, ресницы и брови, эстетическая косметология, парикмахерский зал и аппаратная коррекция фигуры. Можно прийти на одну процедуру, а можно собрать комплекс и за один визит успеть больше: маникюр с педикюром, чистку с массажем лица, ламинирование ресниц и бровей.</p>
    <p>Мы за естественную красоту, аккуратную работу и честный разговор о результате. Цены открыты заранее, скрытых доплат нет, а с каждого чека от 1000 ₽ возвращаем 3% на следующий визит. Стрижем и детей, а для подарка есть сертификаты.</p>
    <ul className="about-facts"><li>Ежедневно с 10:00 до 20:00</li><li>Парковка и Wi-Fi</li><li>Оплата наличными, картой, по QR-коду, есть рассрочка</li></ul>
    <div className="values">{values.map(([t,d])=><div key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
   </div>
  </section>

  <section className="section team" id="team" aria-labelledby="team-title">
   <div className="section-head"><div><div className="eyebrow">МАСТЕРА</div><h2 id="team-title">Красота начинается<br/><em>с доверия.</em></h2></div><p>Три мастера. Разные направления.<br/>Одна студия рядом с вами.</p></div>
   <div className="team-grid">{team.map(m=><article className="master-card" key={m.id}>
    <div className="master-photo"><img src={'/assets/'+m.image+'.jpg'} alt={m.name+' — '+m.role} loading="lazy"/></div>
    <div className="master-name"><h3>{m.name}</h3><button aria-label={'Услуги мастера '+m.name} onClick={()=>showPrices(m.category)}>↗</button></div>
    <span>{m.role}</span><p>{m.text}</p>
   </article>)}</div>
  </section>

  <section className="section works" id="works" aria-labelledby="works-title">
   <div className="section-head"><div><div className="eyebrow">РАБОТЫ И ПРОСТРАНСТВО</div><h2 id="works-title">Детали, которые<br/><em>хочется рассмотреть.</em></h2></div><p>Работы мастеров и интерьер студии.</p></div>
   <div className="gallery">{photos.map(([file,title,size])=><button className={'gallery-item '+size} key={file} onClick={()=>openPhoto('/assets/'+file+'.jpg',title)}><img src={'/assets/'+file+'.jpg'} alt={title} loading="lazy"/><span>{title}</span></button>)}</div>
  </section>
  </>}

  {page==='training'&&<Training catalog={catalog} loadError={loadError} preset={presetFor('training')} pick={topic=>requestLead('training',topic)}/>}

  {page==='contacts'&&<>
  <section className="section contacts" id="contacts" aria-labelledby="contacts-title">
   <div className="contacts-info">
    <div className="eyebrow">КОНТАКТЫ</div><h2 id="contacts-title">Мы <em>рядом.</em></h2>
    <dl>
     <div><dt>Адрес</dt><dd>Брянск, ул. Брянской Пролетарской Дивизии, 30А</dd></div>
     <div><dt>Как добраться</dt><dd>Бежицкий район, ближайшая остановка — «Спортманеж»</dd></div>
     <div><dt>Часы работы</dt><dd>{hours}, по предварительной записи</dd></div>
     <div><dt>Телефоны</dt><dd>{phones.map(p=><a key={p.href} href={p.href}>{p.label}</a>)}</dd></div>
     <div><dt>Написать нам</dt><dd>{messengers.map(([n,u,note])=><a key={n} href={u} target="_blank" rel="noopener noreferrer">{n}{note&&<small> — {note}</small>}</a>)}</dd></div>
    </dl>
    <div className="contact-actions"><Button className="button" label="Построить маршрут" href={maps} target="_blank" rel="noopener noreferrer" endContent={<Arrow/>}/><a className="button ghost" href={phone.href}>Позвонить</a></div>
   </div>
   <div className="map-box">{external==='accepted'?<iframe src={mapWidget} title="Студия Эмблика на Яндекс Картах" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<div className="map-placeholder"><span className="pin" aria-hidden="true">⌖</span><h3>Пролетарской<br/>Дивизии, <em>30А</em></h3><p>Карта загружается с Яндекса после вашего разрешения.</p><div className="contact-actions"><Button className="button" label="Показать карту" onClick={()=>allow('accepted')}/><a className="text-link" href={maps} target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах ↗</a></div></div>}</div>
  </section>

  <section className="section faq" aria-labelledby="faq-title"><div><div className="eyebrow">ПЕРЕД ВИЗИТОМ</div><h2 id="faq-title">Остались<br/><em>вопросы?</em></h2><p>Самое полезное — до того,<br/>как вы сядете в кресло мастера.</p></div><div>{faq.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
  </>}
 </main>

 <footer className="footer">
  <div className="footer-brand"><a className="logo" href="#/">эмблика<span>СТУДИЯ КРАСОТЫ</span></a><p>Брянск, ул. Брянской Пролетарской Дивизии, 30А<br/>{hours}<br/>{phones.map((p,i)=><React.Fragment key={p.href}>{i>0&&' · '}<a href={p.href}>{p.label}</a></React.Fragment>)}</p></div>
  <nav className="footer-nav" aria-label="Разделы">{pages.map(navLink)}</nav>
  <div className="footer-links">{socials.map(([n,u])=><a key={n} href={u} target="_blank" rel="noopener noreferrer">{n}</a>)}<a href="/privacy.html">Политика конфиденциальности</a><a href="/consent.html">Согласие на обработку данных</a><a href="/rules.html">Правила записи</a><button className="footer-settings" onClick={()=>setCookieOpen(true)}>Настройки внешних сервисов</button><a href="/admin/">Кабинет студии</a></div>
  <p className="footer-copy">© Эмблика, 2026 · <span>Тестовый сайт для презентации</span></p>
 </footer>
 <div className="mobile-book"><a href={href('services')}>Услуги</a><a href={booking}>Записаться <Arrow/></a></div>
 {cookieOpen&&<aside className="cookie-banner" aria-label="Внешние сервисы"><div><strong>Отзывы и карта — из Яндекса</strong><p>Разрешите загрузку виджетов Яндекс Карт с отзывами и схемой проезда. Без разрешения сайт, прайс и запись продолжат работать. <a href="/privacy.html">Подробнее</a></p></div><div><button onClick={()=>allow('accepted')}>Принять</button><button onClick={()=>allow('declined')}>Отклонить</button></div></aside>}
 {gallery&&<dialog id="photo-dialog" onCancel={()=>setGallery(null)} onClick={e=>{if(e.target===e.currentTarget)setGallery(null);}}><button autoFocus onClick={()=>setGallery(null)} aria-label="Закрыть фотографию">Закрыть ×</button><img src={gallery.src} alt={gallery.title}/><p>{gallery.title}</p></dialog>}
 </>;
}
createRoot(document.getElementById('root')).render(<Theme theme={neutralTheme} mode="light">{location.pathname.startsWith('/admin')?<Admin/>:<App/>}</Theme>);
