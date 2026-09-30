import React from 'react';
import {Button} from '@astryxdesign/core/Button';
import LeadForm from './LeadForm';
import './training.css';

// Тексты раздела — от студии (30.09.2026). Латинское название программы не используем
// без зарегистрированного товарного знака (168-ФЗ), поэтому «Бьюти Масштаб».
export const onlineProgram='Онлайн-программа «Бьюти Масштаб»';
const offline=[
 {group:'Ресницы',courses:[
  ['Наращивание ресниц','Освоение техники наращивания и построения красивого результата с учётом исходных данных клиента.'],
  ['LED-наращивание ресниц','Обучение работе в современной технике наращивания с LED-технологией, которая сейчас особенно востребована.'],
  ['Ламинирование ресниц','Освоение процедуры работы с натуральными ресницами в классической и корейской технике.']
 ]},
 {group:'Брови',courses:[
  ['Оформление бровей','Форма, коррекция, работа с особенностями клиента и создание гармоничного результата.'],
  ['Ламинирование бровей','Техника процедуры, работа с формой и натуральными волосками.']
 ]}
];
const steps=[
 ['Теория','Разбираем технологию процедуры, материалы, инструменты и важные нюансы работы.'],
 ['Демонстрация','Преподаватель показывает технику и объясняет последовательность действий.'],
 ['Практика','Вы самостоятельно выполняете процедуру.'],
 ['Обратная связь','Преподаватель наблюдает за вашей работой и корректирует ошибки.'],
 ['Закрепление','Разбираем результат и вопросы, которые возникают во время практики.']
];
const chain=['Преподаватель показывает','вы повторяете','получаете обратную связь','исправляете ошибки','закрепляете навык'];
export const trainingTopics=[
 {label:'Офлайн-обучение с нуля',options:offline.flatMap(g=>g.courses.map(([title])=>title))},
 {label:'Онлайн-обучение',options:[onlineProgram]},
 {label:'Другое',options:['Нужна консультация по выбору обучения']}
];
const scrollTo=id=>document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});

export default function Training({catalog,loadError,preset,pick}){
 return <>
 <section className="section tr-intro" id="training" aria-labelledby="training-title">
  <div className="eyebrow">ОБУЧЕНИЕ</div>
  <h2 id="training-title">Обучение, которое помогает не только научиться делать, <em>но и развиваться в профессии</em></h2>
  <p className="tr-lead">Офлайн — ставим технику и учим выполнять процедуры. Онлайн — учим привлекать клиентов, вести соцсети и развивать личный бренд мастера.</p>
  <ul className="tr-tags"><li>Практика</li><li>Системный подход</li><li>Навыки для реальной работы</li></ul>
  <h3 className="tr-question">С чего вы хотите начать?</h3>
  <div className="tr-choice">
   <article>
    <span className="tr-format">ОФЛАЙН-ОБУЧЕНИЕ</span>
    <h4>Я хочу научиться делать процедуры</h4>
    <p>Практика в реальном времени с преподавателем. Освоение профессии и навыка выполнения процедур: наращивание ресниц в классической технике, ламинирование ресниц, оформление и ламинирование бровей.</p>
    <button className="text-link" onClick={()=>scrollTo('offline')}>Смотреть офлайн-курсы ↓</button>
   </article>
   <article className="dark">
    <span className="tr-format">ОНЛАЙН-ОБУЧЕНИЕ</span>
    <h4>Я уже умею работать и хочу больше клиентов</h4>
    <p>Система привлечения клиентов и продвижения мастера: социальные сети, контент, позиционирование, привлечение и работа с клиентским потоком.</p>
    <button className="text-link" onClick={()=>scrollTo('online')}>Смотреть онлайн-программу ↓</button>
   </article>
  </div>
  <p className="fine">Можно начать с одного направления, а затем перейти к следующему уровню.</p>
 </section>

 <section className="section tr-offline" id="offline" aria-labelledby="offline-title">
  <div className="section-head"><div><div className="eyebrow">ОФЛАЙН-ОБУЧЕНИЕ</div><h2 id="offline-title">Профессия начинается <em>с навыка</em></h2></div><p className="tr-badge">Все программы — обучение с нуля</p></div>
  <div className="tr-offline-copy">
   <p>На офлайн-обучении вы не просто смотрите, как работает преподаватель. Вы изучаете технологию, наблюдаете демонстрацию и отрабатываете процедуру самостоятельно под контролем преподавателя. В реальном времени. С практикой. С обратной связью.</p>
   <div><strong className="tr-motto">Не смотрим — делаем.</strong><p>Вы приходите не за набором теоретических уроков, а за практическим навыком, который нужно поставить в руки.</p></div>
  </div>
  <ol className="tr-chain" aria-label="Как ставится навык">{chain.map(c=><li key={c}>{c}</li>)}</ol>
  {offline.map(g=><div className="tr-group" key={g.group}>
   <h3>{g.group}</h3>
   <div className="tr-courses">{g.courses.map(([title,text])=><article className="tr-course" key={title}>
    <span className="tr-zero">С нуля</span><h4>{title}</h4><p>{text}</p>
    <small>Программа, даты и стоимость — по запросу</small>
    <button className="price-book" onClick={()=>pick(title)}>Оставить заявку</button>
   </article>)}</div>
  </div>)}
  <div className="tr-steps">
   <h3>Как проходит обучение?</h3>
   <ol>{steps.map(([t,d],i)=><li key={t}><span>{String(i+1).padStart(2,'0')}</span><strong>{t}</strong><p>{d}</p></li>)}</ol>
  </div>
 </section>

 <section className="tr-online" id="online" aria-labelledby="online-title">
  <div className="section">
   <div className="eyebrow">ОНЛАЙН-ОБУЧЕНИЕ</div>
   <h2 id="online-title">Вы умеете делать. <em>А клиенты об этом знают?</em></h2>
   <div className="tr-online-grid">
    <div className="tr-online-copy">
     <p>Онлайн-обучение для мастеров, которые хотят научиться привлекать клиентов, вести социальные сети и системно развивать своё присутствие в интернете.</p>
     <p className="tr-accent">Не учим просто «вести соцсети». Учим превращать социальные сети в инструмент привлечения клиентов.</p>
     <p>Потому что мастеру не нужны сами по себе:</p>
     <ul className="tr-not"><li>красивые сторис</li><li>подписчики</li><li>лайки</li><li>эстетичная лента</li></ul>
     <p className="tr-accent">Ему нужны клиенты и запись.</p>
     <p>Вам не нужен блог ради блога. Вам нужна система, которая помогает потенциальному клиенту увидеть вас, понять вашу экспертность и захотеть записаться.</p>
    </div>
    <article className="tr-program">
     <span className="tr-program-name">БЬЮТИ МАСШТАБ</span>
     <small>6 недель для роста мастера и бьюти-бизнеса</small>
     <h3>6 недель, чтобы по-новому посмотреть на себя как на мастера и свой бьюти-бизнес</h3>
     <p>Онлайн-программа от основателя студии красоты «Эмблика»: личный бренд, социальные сети, привлечение клиентов, самопрезентация, работа с площадками, построение команды и развитие бьюти-бизнеса.</p>
     <ul className="tr-format-list"><li>6 недель</li><li>видео-уроки</li><li>индивидуальные созвоны</li><li>групповые созвоны</li></ul>
     <p className="tr-topics">Личный бренд • социальные сети • самопрезентация • привлечение клиентов • команда • развитие</p>
     <blockquote>Вы уже умеете делать красиво. Теперь — время масштабировать себя, свои навыки и свой бьюти-бизнес.</blockquote>
     <Button className="button" label="Узнать о программе" onClick={()=>pick(onlineProgram)} endContent={<span aria-hidden="true">↗</span>}/>
    </article>
   </div>
  </div>
 </section>

 <section className="section tr-form" id="training-form" aria-labelledby="training-form-title">
  <div>
   <div className="eyebrow">ЗАЯВКА НА ОБУЧЕНИЕ</div>
   <h2 id="training-form-title">Выберите, <em>с чего начать</em></h2>
   <p>Отметьте курс в списке или опишите в комментарии, что вас интересует. Администратор перезвонит и расскажет о программе, ближайших датах и стоимости.</p>
  </div>
  <LeadForm catalog={catalog} loadError={loadError} type="training" topics={trainingTopics} preset={preset} title="Заявка на обучение" caption="Офлайн-курсы с нуля или онлайн-программа" submitLabel="Отправить заявку" commentHint="Какое обучение интересует, ваш опыт, удобные дни"/>
 </section>
 </>;
}
