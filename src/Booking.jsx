import React,{useEffect,useRef,useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {api,money,dateLabel} from './api';
export default function Booking({catalog,selected,setSelected,loadError}){
 const [master,setMaster]=useState(''),[date,setDate]=useState(''),[time,setTime]=useState(''),[times,setTimes]=useState([]),[loading,setLoading]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[revision,setRevision]=useState(0);
 const requestId=useRef('');const resultRef=useRef(null);const lock=useRef(false);
 const service=catalog?.services.find(s=>String(s.id)===String(selected));
 const masters=catalog?.masters.filter(m=>service&&JSON.parse(service.masters).includes(Number(m.id)))||[];
 useEffect(()=>{if(catalog&&!date)setDate(catalog.today);},[catalog,date]);
 useEffect(()=>{setMaster('');setTime('');setResult(null);},[selected]);
 useEffect(()=>{if(masters.length===1)setMaster(String(masters[0].id));},[selected,catalog]);
 useEffect(()=>{
   setTime('');setTimes([]);setError('');
   if(!selected||!master||!date)return;
   const controller=new AbortController();setLoading(true);
   api(`slots&service=${encodeURIComponent(selected)}&master=${encodeURIComponent(master)}&date=${encodeURIComponent(date)}`,null,controller.signal).then(r=>setTimes(r.times)).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return()=>controller.abort();
 },[selected,master,date,revision]);
 async function submit(e){
   e.preventDefault();if(lock.current)return;if(!time){setError('Выберите свободное время.');return;}
   const f=new FormData(e.currentTarget);const name=f.get('name').trim();const phone=f.get('phone').replace(/\D/g,'');
   if(name.length<2){setError('Введите тестовое имя из двух или более символов.');return;}
   if(!/^[78]\d{10}$/.test(phone)){setError('Введите тестовый номер: +7 000 000-00-00.');return;}
   if(!requestId.current)requestId.current=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
   lock.current=true;setPending(true);setError('');
   try{
     const r=await api('book',{csrf:catalog.csrf,requestId:requestId.current,name,phone,service:Number(selected),master:Number(master),date,time,consent:f.get('consent')==='on',demoConsent:f.get('demoConsent')==='on',website:f.get('website')});
     setResult({...r,service:service.name,master:masters.find(m=>String(m.id)===master)?.name,date,time});requestId.current='';
     setTimeout(()=>resultRef.current?.focus(),0);
   }catch(e){setError(e.message);if(e.status===409){requestId.current='';setRevision(v=>v+1);}}
   finally{lock.current=false;setPending(false);}
 }
 const maxDate=catalog?new Date(new Date(catalog.today+'T12:00:00').getTime()+90*86400000).toISOString().slice(0,10):'';
 return <section className="booking section" id="request"><div className="booking-copy"><div className="eyebrow">ЗАПИСЬ ОНЛАЙН</div><h2>Ваше время.<br/><em>Ваш мастер.</em></h2><p>Выберите процедуру, познакомьтесь с мастером и найдите удобное окно — всё здесь, на сайте.</p><div className="booking-benefits"><p>Стоимость и длительность видны до записи.</p><p>Занятое время сразу исчезает из расписания.</p><p>Администратор видит запись в своём кабинете.</p></div><div className="demo-callout"><strong>Показываем, как это работает</strong><p>Это тестовая версия для знакомства с новым сайтом. Расписание демонстрационное. Используйте вымышленное имя и номер +7 000 000-00-00. Студия не получает уведомления.</p></div><a className="booking-phone" href="tel:+79964474306">Вопросы студии: +7 (996) 447-43-06</a></div>
 <div className="form-card booking-card">{result?<div className="booking-success" tabIndex={-1} ref={resultRef}><span className="success-mark">✓</span><h3>Тестовая запись создана</h3><p>Номер {result.reference}</p><dl><dt>Услуга</dt><dd>{result.service}</dd><dt>Мастер</dt><dd>{result.master}</dd><dt>Когда</dt><dd>{dateLabel(result.date)}, {result.time} · Москва</dd></dl><p>Запись сохранена в демонстрационной базе. Это не реальное бронирование визита в студию.</p><Button className="button" label="Попробовать ещё раз" onClick={()=>{setResult(null);setTime('');setRevision(v=>v+1);}}/></div>:<><h3>Запланируйте маленькую паузу</h3><p className="form-caption">Демонстрационное расписание · московское время</p>{loadError?<p role="alert" className="form-error">{loadError}</p>:!catalog?<p role="status">Загружаем услуги и расписание…</p>:<form onSubmit={submit}>
 <fieldset disabled={pending}><legend className="sr-only">Данные для записи</legend><label>Услуга<select value={selected} onChange={e=>{setSelected(e.target.value);requestId.current='';}} required><option value="">Выберите процедуру</option>{catalog.services.filter(s=>s.mode!=='request').map(s=><option key={s.id} value={s.id}>{s.name} · {money(s.price)}</option>)}</select></label>
 {service&&<div className="booking-summary"><span>{money(service.price)}</span><span>Около {service.duration} мин.</span></div>}
 <label>Мастер<select value={master} onChange={e=>{setMaster(e.target.value);requestId.current='';}} required disabled={!service}><option value="">Выберите мастера</option>{masters.map(m=><option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}</select></label>
 <label>Дата<input type="date" min={catalog.today} max={maxDate} value={date} onChange={e=>{setDate(e.target.value);requestId.current='';}} required/></label>
 <fieldset className="time-fieldset"><legend>Свободное время</legend><div className="time-grid" role="group" aria-label="Свободное время">{loading?<p role="status">Проверяем расписание…</p>:times.length?times.map(t=><button key={t} type="button" aria-pressed={time===t} onClick={()=>{setTime(t);requestId.current='';}}>{t}</button>):<p>{selected&&master?'На эту дату свободных окон нет. Выберите другой день.':'Сначала выберите услугу и мастера.'}</p>}</div></fieldset>
 <div className="form-row"><label>Тестовое имя<input name="name" placeholder="Например, Тестовый гость" required minLength={2} maxLength={80} autoComplete="off"/></label><label>Тестовый телефон<input name="phone" type="tel" placeholder="+7 000 000-00-00" defaultValue="+7 000 000-00-00" required maxLength={24} autoComplete="off"/></label></div>
 <label className="honeypot" aria-hidden="true">Сайт<input name="website" tabIndex={-1} autoComplete="off"/></label>
 <label className="consent"><input type="checkbox" name="demoConsent" required/><span>Понимаю, что это тестовая запись, и использую вымышленные данные.</span></label><label className="consent"><input type="checkbox" name="consent" required/><span>Согласен(на) с <a href="/consent.html" target="_blank" rel="noopener noreferrer">обработкой данных</a> и ознакомлен(а) с <a href="/privacy.html" target="_blank" rel="noopener noreferrer">политикой</a>.</span></label>
 {error&&<p className="form-error" role="alert">{error}</p>}<Button type="submit" className="button form-submit" label={pending?'Сохраняем запись…':'Создать тестовую запись'} isDisabled={pending||!time} endContent={<span aria-hidden="true">↗</span>}/><a className="fine" href="/rules.html" target="_blank" rel="noopener noreferrer">Правила записи</a></fieldset></form>}</> }</div></section>;
}
