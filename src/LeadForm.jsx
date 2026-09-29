import React,{useRef,useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {api} from './api';

// Короткая заявка: клиент просит подобрать услугу или ученик — рассказать об обучении.
export default function LeadForm({catalog,loadError,type,topics,title,caption,submitLabel,dark=false}){
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null);
 const requestId=useRef('');const lock=useRef(false);const resultRef=useRef(null);
 async function submit(e){
  e.preventDefault();if(lock.current)return;
  const f=new FormData(e.currentTarget);const name=f.get('name').trim();const phone=f.get('phone').replace(/\D/g,'');
  if(!f.get('topic')){setError('Выберите направление.');return;}
  if(name.length<2){setError('Введите тестовое имя из двух или более символов.');return;}
  if(!/^[78]\d{10}$/.test(phone)){setError('Введите тестовый номер: +7 000 000-00-00.');return;}
  if(!requestId.current)requestId.current=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  lock.current=true;setPending(true);setError('');
  try{
   const r=await api('lead',{csrf:catalog.csrf,requestId:requestId.current,type,topic:f.get('topic'),name,phone,comment:(f.get('comment')||'').trim(),consent:f.get('consent')==='on',demoConsent:f.get('demoConsent')==='on',website:f.get('website')});
   setResult({...r,topic:f.get('topic')});requestId.current='';setTimeout(()=>resultRef.current?.focus(),0);
  }catch(err){setError(err.message);}
  finally{lock.current=false;setPending(false);}
 }
 const id=type+'-lead';
 return <div className={dark?'form-card lead-card dark':'form-card lead-card'}>{result?<div className="booking-success" tabIndex={-1} ref={resultRef}><span className="success-mark">✓</span><h3>Тестовая заявка отправлена</h3><p>Номер {result.reference} · {result.topic}</p><p>Заявка сохранена в демонстрационной базе и видна администратору в кабинете. Студия не получает уведомления о тестовых заявках.</p><Button className="button" label="Отправить ещё одну" onClick={()=>setResult(null)}/></div>:<>
  <h3>{title}</h3><p className="form-caption">{caption}</p>
  {loadError?<p role="alert" className="form-error">{loadError}</p>:!catalog?<p role="status">Загружаем форму…</p>:<form onSubmit={submit}><fieldset disabled={pending}><legend className="sr-only">{title}</legend>
   <label>Направление<select name="topic" defaultValue="" required><option value="" disabled>Выберите направление</option>{topics.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
   <div className="form-row"><label>Тестовое имя<input name="name" placeholder="Например, Тестовый гость" required minLength={2} maxLength={80} autoComplete="off"/></label><label>Тестовый телефон<input name="phone" type="tel" placeholder="+7 000 000-00-00" defaultValue="+7 000 000-00-00" required maxLength={24} autoComplete="off"/></label></div>
   <label>Комментарий (необязательно)<textarea name="comment" rows={3} maxLength={500} placeholder={type==='training'?'Опыт, удобные дни, вопросы о программе':'Что хотите сделать, удобное время для звонка'}/></label>
   <label className="honeypot" aria-hidden="true">Сайт<input name="website" tabIndex={-1} autoComplete="off"/></label>
   <label className="consent"><input type="checkbox" name="demoConsent" required/><span>Понимаю, что это тестовая заявка, и использую вымышленные данные.</span></label>
   <label className="consent"><input type="checkbox" name="consent" required id={id+'-consent'}/><span>Согласен(на) с <a href="/consent.html" target="_blank" rel="noopener noreferrer">обработкой данных</a> и ознакомлен(а) с <a href="/privacy.html" target="_blank" rel="noopener noreferrer">политикой</a>.</span></label>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <Button type="submit" className="button form-submit" label={pending?'Отправляем…':submitLabel} isDisabled={pending} endContent={<span aria-hidden="true">↗</span>}/>
  </fieldset></form>}</>}
 </div>;
}
