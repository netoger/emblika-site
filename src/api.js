export async function api(action, data, signal) {
 const response=await fetch(`/api/index.php?action=${action}`,{credentials:'same-origin',signal,...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
 let result;try{result=await response.json();}catch{throw new Error('Сервис записи временно недоступен. Обновите страницу.');}
 if(!response.ok){const e=new Error(result.error||'Не удалось выполнить запрос.');e.status=response.status;throw e;}
 return result;
}
// Отправка формы с файлом (фото услуги): тело — FormData, а не JSON.
export async function upload(action, form) {
 const response=await fetch(`/api/index.php?action=${action}`,{method:'POST',credentials:'same-origin',body:form});
 let result;try{result=await response.json();}catch{throw new Error('Не удалось загрузить файл. Попробуйте позднее.');}
 if(!response.ok){const e=new Error(result.error||'Не удалось загрузить файл.');e.status=response.status;throw e;}
 return result;
}
export const money=price=>price==null?'По согласованию':new Intl.NumberFormat('ru-RU').format(price)+' ₽';
// Цена услуги из прайса: бесплатные консультации и цены «от» — как в прайсе студии.
export const cost=s=>s.price==null?'По согласованию':Number(s.price)===0?'Бесплатно':(Number(s.price_from)?'от ':'')+money(s.price);
export const minutes=m=>{m=Number(m);const h=Math.floor(m/60),r=m%60;return [h&&h+' ч',r&&r+' мин'].filter(Boolean).join(' ');};
export const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
