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
import Admin from './Admin';
import {api,money} from './api';
import './extension.css';

// Вкладки сайта. Адрес вида #/prices работает на любом хостинге без правил перезаписи.
const pages=[['home','Главная'],['prices','Услуги и цены'],['booking','Запись'],['about','О студии'],['training','Обучение'],['contacts','Контакты']];
// Старые якоря одностраничной версии ведут на вкладку, где теперь лежит раздел.
const legacy={directions:'home',reviews:'home',prices:'prices',request:'booking',lead:'booking',about:'about',team:'about',works:'about',training:'training',contacts:'contacts'};
const href=id=>id==='home'?'#/':'#/'+id;
const booking=href('booking');
const baseTitle='Эмблика — время для себя · Брянск';
function readPage(){
 const h=location.hash.slice(1);
 if(h.startsWith('/'))return pages.some(([id])=>id===h.slice(1))?h.slice(1):'home';
 return h?legacy[h]||null:'home';
}
const maps='https://yandex.ru/maps/org/emblika/145016511707/';
const mapWidget='https://yandex.ru/map-widget/v1/org/emblika/145016511707/';
const phone={href:'tel:+79964474306',label:'+7 (996) 447-43-06'};
// Ссылки и часы работы — из открытой карточки студии на DIKIDI.
// Мессенджер Meta не выводим: сервисы Meta со страниц убираем (скилл russian_site).
const socials=[['Telegram','https://t.me/Emblicabeautybar'],['ВКонтакте','https://vk.com/emblica']];
const hours='Ежедневно, 10:00–19:00';
// Категории совпадают с полем category в таблице services.
const directions=[
 {category:'Ногти',title:'Маникюр и педикюр',image:'work-1',text:'Уход, покрытие гель-лаком, наращивание и экспресс-педикюр.'},
 {category:'Ресницы и брови',title:'Ресницы и брови',image:'work-2',text:'Наращивание и ламинирование ресниц, оформление бровей.'},
 {category:'Уход за лицом',title:'Уход за лицом',image:'room',text:'Уходовые программы и массаж лица.'},
 {category:'Волосы',title:'Волосы',image:'studio',text:'Женские и мужские стрижки, окрашивание волос.'}
];
const values=[
 ['Забота без спешки','Длительность процедуры известна заранее — время рассчитано так, чтобы мастеру не приходилось торопиться.'],
 ['Стоимость до визита','Прайс открыт на сайте. Цену и длительность вы видите до того, как выбираете время.'],
 ['Внимание к деталям','Форму, оттенок и привычный уход обсуждаем до начала работы, а не по ходу.'],
 ['Растим мастеров','На базе студии проходит обучение — делимся опытом с теми, кто только начинает путь в профессии.']
];
const team=[
 {id:1,name:'Полина',role:'Ресницы, брови и уход за лицом',image:'polina',text:'Оформление бровей, ламинирование и наращивание ресниц. Поможет обсудить желаемую форму и выразительность взгляда.',service:4},
 {id:2,name:'Анна',role:'Маникюр и педикюр',image:'anna',text:'Уход за ногтями, покрытие и наращивание. Сдержанный нюд, яркий цвет или новая форма — начните с ваших пожеланий.',service:1},
 {id:3,name:'Мария',role:'Парикмахер',image:'maria',text:'Женские и мужские стрижки, окрашивание волос. Обсудите длину, оттенок и то, как вы привыкли укладывать волосы.',service:8}
];
const photos=[
 ['work-1','Маникюр в натуральном оттенке','tall'],
 ['detail','Рабочее место мастера',''],
 ['work-2','Оформление бровей: до и после',''],
 ['room','Кабинет ухода за лицом','tall'],
 ['work-3','Аккуратная форма и естественное покрытие',''],
 ['studio','Зал студии','']
];
const courses=[
 {title:'Ногтевой сервис',image:'work-3',text:'Маникюр, подготовка ногтевой пластины и покрытие гель-лаком.'},
 {title:'Ресницы',image:'polina',text:'Наращивание и ламинирование ресниц: подбор изгиба, длины и эффекта.'},
 {title:'Брови',image:'work-2',text:'Архитектура и оформление бровей, подбор формы под черты лица.'}
];
const trainingTopics=['Ногтевой сервис','Наращивание и ламинирование ресниц','Оформление бровей','Другое направление'];
const clientTopics=['Помочь выбрать услугу',...directions.map(d=>d.title),'Подарочный визит'];
const faq=[
 ['Как работает запись на новом сайте?','Выберите услугу, мастера, дату и свободное время. После отправки запись появится в кабинете студии, а выбранное окно станет недоступным другим посетителям. Сейчас сайт работает в тестовом режиме: реальный визит не бронируется.'],
 ['Не знаю, какую услугу выбрать. Что делать?','Оставьте заявку «Подберём процедуру» на вкладке «Запись» или позвоните по номеру +7 (996) 447-43-06. Особенно полезно заранее обсудить окрашивание, уход за лицом и сложный дизайн ногтей.'],
 ['Цена на сайте окончательная?','Сейчас это ориентиры для презентации. Итоговая стоимость зависит от процедуры, длины волос или ногтей, дизайна и дополнительных услуг. Подтвердите её с мастером до начала работы.'],
 ['Можно ли прийти на несколько процедур?','Да, в студии несколько направлений. На сайте создайте отдельную запись на каждую процедуру, а последовательность обсудите со студией.'],
 ['Как попасть на обучение?','Оставьте заявку на вкладке «Обучение». Администратор свяжется с вами и расскажет о программе, датах и стоимости.'],
 ['Как изменить или отменить запись?','В тестовой версии администратор отменяет запись в кабинете — время снова появляется в расписании. Реальные договорённости о визите меняются напрямую со студией по телефону.']
];
const explore=[
 ['about','О студии и мастерах','Пространство, ценности, команда и фотографии работ.'],
 ['training','Обучение','Курсы на базе студии и заявка ученика.'],
 ['contacts','Контакты и вопросы','Адрес, часы работы, карта и ответы перед визитом.']
];
const Arrow=()=> <span aria-hidden="true">↗</span>;

function App(){
 const [menu,setMenu]=useState(false),[catalog,setCatalog]=useState(null),[selected,setSelected]=useState(''),[loadError,setLoadError]=useState('');
 const [category,setCategory]=useState('all'),[search,setSearch]=useState('');
 const [external,setExternal]=useState(()=>{try{return localStorage.getItem('emblika-external');}catch{return null;}});
 const [cookieOpen,setCookieOpen]=useState(!external),[gallery,setGallery]=useState(null);
 const [page,setPage]=useState(()=>readPage()||'home');
 const first=useRef(true);
 function allow(value){setExternal(value);setCookieOpen(false);try{localStorage.setItem('emblika-external',value);}catch{}}
 useEffect(()=>{api('catalog').then(setCatalog).catch(e=>setLoadError(e.message));},[]);
 useEffect(()=>{if(!gallery)return;const dialog=document.getElementById('photo-dialog');dialog?.showModal();return()=>dialog?.close();},[gallery]);
 useEffect(()=>{
  // Старый якорь заменяем адресом вкладки, чтобы кнопка «Назад» работала предсказуемо.
  // Прочие якоря без «/» (например, ссылка «Перейти к содержимому») вкладку не меняют.
  const sync=()=>{
   const h=location.hash.slice(1);if(h&&!h.startsWith('/')&&legacy[h])history.replaceState(null,'',href(legacy[h]));
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
 function showPrices(cat){setCategory(cat);setSearch('');go('prices');}
 const fromPrice=cat=>{const list=(catalog?.services||[]).filter(s=>s.category===cat&&s.price!=null).map(s=>Number(s.price));return list.length?'от '+money(Math.min(...list)):'Цена по согласованию';};
 const services=useMemo(()=>{
  const q=search.trim().toLowerCase();
  return (catalog?.services||[]).filter(s=>(category==='all'||s.category===category)&&(!q||`${s.name} ${s.description} ${s.category}`.toLowerCase().includes(q)));
 },[catalog,category,search]);
 const nav=pages.filter(([id])=>id!=='home');
 const navLink=([id,label])=><a key={id} href={href(id)} aria-current={page===id?'page':undefined} onClick={()=>setMenu(false)}>{label}</a>;

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
    <p>Ногти, ресницы и брови, уход за лицом и волосы — в одной спокойной студии. Выберите услугу, посмотрите цену и запишитесь онлайн за пару минут.</p>
    <div className="hero-actions"><Button className="button" label="Записаться онлайн" href={booking} endContent={<Arrow/>}/><a className="button ghost" href={href('prices')}>Смотреть прайс</a></div>
    <ul className="hero-facts"><li><strong>4</strong><span>направления<br/>в одной студии</span></li><li><strong>3</strong><span>мастера<br/>в команде</span></li><li><strong>10–19</strong><span>ежедневно<br/>по записи</span></li></ul>
   </div>
   <div className="hero-visual">
    <div className="hero-main"><img src="/assets/detail.jpg" alt="Рабочее место мастера в студии Эмблика: зеркало и зелёные панно" fetchPriority="high"/></div>
    <div className="hero-inset"><img src="/assets/work-1.jpg" alt="Маникюр в натуральном оттенке" loading="lazy"/></div>
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

  <section className="reviews section" id="reviews" aria-labelledby="reviews-title">
   <div className="review-story"><div className="eyebrow">ОТЗЫВЫ</div><h2 id="reviews-title">Знакомство<br/><em>через впечатления.</em></h2><p>Отзывы помогают почувствовать атмосферу студии ещё до первого визита. Здесь — виджет реальной карточки «Эмблики» на Яндекс Картах.</p><a href={maps+'reviews/'} target="_blank" rel="noopener noreferrer" className="text-link">Открыть все отзывы <Arrow/></a></div>
   <div className="review-widget">{external==='accepted'?<iframe src="https://yandex.ru/maps-reviews-widget/145016511707?comments" title="Отзывы о студии Эмблика на Яндекс Картах" loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>:<div className="review-placeholder"><span className="review-symbol">“</span><h3>Гости — о студии</h3><p>Чтобы показать актуальные отзывы, нужно загрузить виджет Яндекса. Сервис получит технические данные вашего браузера.</p><Button className="button" label="Загрузить отзывы Яндекса" onClick={()=>allow('accepted')}/></div>}</div>
  </section>

  <section className="section explore" aria-labelledby="explore-title">
   <div className="section-head"><div><div className="eyebrow">НА САЙТЕ</div><h2 id="explore-title">Что ещё <em>посмотреть?</em></h2></div></div>
   <div className="explore-grid">{explore.map(([id,title,text])=><a className="explore-card" key={id} href={href(id)}><strong>{title}</strong><small>{text}</small><i aria-hidden="true">→</i></a>)}</div>
  </section>
  </>}

  {page==='prices'&&<section className="section prices" id="prices" aria-labelledby="prices-title">
   <div className="section-head"><div><div className="eyebrow">ПРАЙС</div><h2 id="prices-title">Услуги <em>и цены</em></h2></div><p>Найдите процедуру по названию и сразу выберите время.</p></div>
   <div className="price-tools">
    <label className="price-search"><span className="sr-only">Поиск услуги</span><input type="search" placeholder="Поиск: маникюр, ресницы, стрижка…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="chips" role="group" aria-label="Направление">{[['all','Все услуги'],...directions.map(d=>[d.category,d.title])].map(([id,label])=><button key={id} aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</div>
   </div>
   <div className="price-table" aria-live="polite">{!catalog?<p className="price-empty">{loadError||'Загружаем услуги…'}</p>:services.length?services.map(s=><div className="price-row" key={s.id}>
    <div className="price-name"><span className="price-cat">{s.category}</span><strong>{s.name}</strong><small>{s.description}</small></div>
    <span className="price-duration">≈ {s.duration} мин</span>
    <span className="price-value">{money(s.price)}</span>
    <button className="price-book" onClick={()=>choose(s.id)} aria-label={'Записаться: '+s.name}>Записаться</button>
   </div>):<p className="price-empty">Ничего не нашли. Попробуйте другое слово или <a href={href('booking')}>оставьте заявку</a> — подберём процедуру.</p>}</div>
   <p className="fine">Цены — ориентиры для демонстрации. Итоговую стоимость и длительность подтверждает мастер до начала процедуры.</p>
  </section>}

  {page==='booking'&&<>
  <Booking catalog={catalog} selected={selected} setSelected={setSelected} loadError={loadError}/>

  <section className="section lead" id="lead" aria-labelledby="lead-title">
   <div className="lead-copy"><div className="eyebrow">ПОДБЕРЁМ ПРОЦЕДУРУ</div><h2 id="lead-title">Не знаете,<br/><em>что выбрать?</em></h2><p>Оставьте заявку — администратор перезвонит, поможет подобрать процедуру и мастера и предложит удобное время.</p><div className="lead-contacts"><a href={phone.href}>{phone.label}</a>{socials.map(([n,u])=><a key={n} href={u} target="_blank" rel="noopener noreferrer">{n} ↗</a>)}</div></div>
   <LeadForm catalog={catalog} loadError={loadError} type="client" topics={clientTopics} title="Заявка на консультацию" caption="Ответим в рабочее время студии" submitLabel="Жду звонка"/>
  </section>
  </>}

  {page==='about'&&<>
  <section className="section about" id="about" aria-labelledby="about-title">
   <div className="about-photos"><img className="about-a" src="/assets/studio.jpg" alt="Зал студии Эмблика" loading="lazy"/><img className="about-b" src="/assets/room.jpg" alt="Кабинет ухода за лицом" loading="lazy"/></div>
   <div className="about-copy">
    <div className="eyebrow">О СТУДИИ</div>
    <h2 id="about-title">Место, где можно<br/><em>выдохнуть.</em></h2>
    <p>«Эмблика» — студия красоты в Бежицком районе Брянска. Светлые залы, зелень и спокойный ритм — здесь не нужно торопиться, а можно просто побыть немного для себя.</p>
    <p>Мы за естественную красоту, аккуратную работу и честный разговор о результате. Приходите за привычным уходом или начните с небольшой перемены.</p>
    <div className="values">{values.map(([t,d])=><div key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
   </div>
  </section>

  <section className="section team" id="team" aria-labelledby="team-title">
   <div className="section-head"><div><div className="eyebrow">МАСТЕРА</div><h2 id="team-title">Красота начинается<br/><em>с доверия.</em></h2></div><p>Три мастера. Разные направления.<br/>Одна студия рядом с вами.</p></div>
   <div className="team-grid">{team.map(m=><article className="master-card" key={m.id}>
    <div className="master-photo"><img src={'/assets/'+m.image+'.jpg'} alt={m.name+' — '+m.role} loading="lazy"/></div>
    <div className="master-name"><h3>{m.name}</h3><button aria-label={'Записаться к мастеру '+m.name} onClick={()=>choose(m.service)}>↗</button></div>
    <span>{m.role}</span><p>{m.text}</p>
   </article>)}</div>
  </section>

  <section className="section works" id="works" aria-labelledby="works-title">
   <div className="section-head"><div><div className="eyebrow">РАБОТЫ И ПРОСТРАНСТВО</div><h2 id="works-title">Детали, которые<br/><em>хочется рассмотреть.</em></h2></div><p>Работы мастеров и интерьер студии.</p></div>
   <div className="gallery">{photos.map(([file,title,size])=><button className={'gallery-item '+size} key={file} onClick={()=>setGallery({file,title})}><img src={'/assets/'+file+'.jpg'} alt={title} loading="lazy"/><span>{title}</span></button>)}</div>
  </section>
  </>}

  {page==='training'&&<section className="training" id="training" aria-labelledby="training-title">
   <div className="section training-inner">
    <div className="training-head">
     <div className="eyebrow">ОБУЧЕНИЕ НА БАЗЕ СТУДИИ</div>
     <h2 id="training-title">Учитесь там, где<br/><em>работают мастера.</em></h2>
     <p>Занятия проходят в пространстве «Эмблики» — на тех же рабочих местах, где мастера принимают гостей. Подойдёт тем, кто начинает в профессии, и мастерам, которые хотят освоить новое направление.</p>
    </div>
    <div className="course-grid">{courses.map(c=><article className="course-card" key={c.title}><img src={'/assets/'+c.image+'.jpg'} alt="" loading="lazy"/><div><h3>{c.title}</h3><p>{c.text}</p><span>Программа, даты и стоимость — по запросу</span></div></article>)}</div>
    <div className="training-bottom">
     <div className="steps"><h3>Как попасть на обучение</h3><ol>
      <li><strong>Заявка</strong><span>Выберите направление и оставьте контакты.</span></li>
      <li><strong>Консультация</strong><span>Администратор расскажет о программе, датах и стоимости.</span></li>
      <li><strong>Занятия в студии</strong><span>Теория и практика на рабочих местах мастеров.</span></li>
     </ol><p className="fine">Программы, расписание групп и документы об окончании уточняются у студии. Информация появится здесь после согласования.</p></div>
     <LeadForm catalog={catalog} loadError={loadError} type="training" topics={trainingTopics} title="Заявка на обучение" caption="Перезвоним и расскажем о ближайших датах" submitLabel="Отправить заявку" dark/>
    </div>
   </div>
  </section>}

  {page==='contacts'&&<>
  <section className="section contacts" id="contacts" aria-labelledby="contacts-title">
   <div className="contacts-info">
    <div className="eyebrow">КОНТАКТЫ</div><h2 id="contacts-title">Мы <em>рядом.</em></h2>
    <dl>
     <div><dt>Адрес</dt><dd>Брянск, ул. Брянской Пролетарской Дивизии, 30А</dd></div>
     <div><dt>Как добраться</dt><dd>Бежицкий район, ближайшая остановка — «Спортманеж»</dd></div>
     <div><dt>Часы работы</dt><dd>{hours}, по предварительной записи</dd></div>
     <div><dt>Телефон</dt><dd><a href={phone.href}>{phone.label}</a></dd></div>
    </dl>
    <div className="socials">{socials.map(([n,u])=><a key={n} href={u} target="_blank" rel="noopener noreferrer">{n}</a>)}</div>
    <div className="contact-actions"><Button className="button" label="Построить маршрут" href={maps} target="_blank" rel="noopener noreferrer" endContent={<Arrow/>}/><a className="button ghost" href={phone.href}>Позвонить</a></div>
   </div>
   <div className="map-box">{external==='accepted'?<iframe src={mapWidget} title="Студия Эмблика на Яндекс Картах" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<div className="map-placeholder"><span className="pin" aria-hidden="true">⌖</span><h3>Пролетарской<br/>Дивизии, <em>30А</em></h3><p>Карта загружается с Яндекса после вашего разрешения.</p><div className="contact-actions"><Button className="button" label="Показать карту" onClick={()=>allow('accepted')}/><a className="text-link" href={maps} target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах ↗</a></div></div>}</div>
  </section>

  <section className="section faq" aria-labelledby="faq-title"><div><div className="eyebrow">ПЕРЕД ВИЗИТОМ</div><h2 id="faq-title">Остались<br/><em>вопросы?</em></h2><p>Самое полезное — до того,<br/>как вы сядете в кресло мастера.</p></div><div>{faq.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
  </>}
 </main>

 <footer className="footer">
  <div className="footer-brand"><a className="logo" href="#/">эмблика<span>СТУДИЯ КРАСОТЫ</span></a><p>Брянск, ул. Брянской Пролетарской Дивизии, 30А<br/>{hours} · <a href={phone.href}>{phone.label}</a></p></div>
  <nav className="footer-nav" aria-label="Разделы">{pages.map(navLink)}</nav>
  <div className="footer-links">{socials.map(([n,u])=><a key={n} href={u} target="_blank" rel="noopener noreferrer">{n}</a>)}<a href="/privacy.html">Политика конфиденциальности</a><a href="/consent.html">Согласие на обработку данных</a><a href="/rules.html">Правила записи</a><button className="footer-settings" onClick={()=>setCookieOpen(true)}>Настройки внешних сервисов</button><a href="/admin/">Кабинет студии</a></div>
  <p className="footer-copy">© Эмблика, 2026 · <span>Тестовый сайт для презентации</span></p>
 </footer>
 <div className="mobile-book"><a href={href('prices')}>Прайс</a><a href={booking}>Записаться <Arrow/></a></div>
 {cookieOpen&&<aside className="cookie-banner" aria-label="Внешние сервисы"><div><strong>Отзывы и карта — из Яндекса</strong><p>Разрешите загрузку виджетов Яндекс Карт с отзывами и схемой проезда. Без разрешения сайт, прайс и запись продолжат работать. <a href="/privacy.html">Подробнее</a></p></div><div><button onClick={()=>allow('accepted')}>Принять</button><button onClick={()=>allow('declined')}>Отклонить</button></div></aside>}
 {gallery&&<dialog id="photo-dialog" onCancel={()=>setGallery(null)} onClick={e=>{if(e.target===e.currentTarget)setGallery(null);}}><button autoFocus onClick={()=>setGallery(null)} aria-label="Закрыть фотографию">Закрыть ×</button><img src={'/assets/'+gallery.file+'.jpg'} alt={gallery.title}/><p>{gallery.title}</p></dialog>}
 </>;
}
createRoot(document.getElementById('root')).render(<Theme theme={neutralTheme} mode="light">{location.pathname.startsWith('/admin')?<Admin/>:<App/>}</Theme>);
