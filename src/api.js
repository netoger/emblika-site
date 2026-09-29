export async function api(action, data, signal) {
 const response=await fetch(`/api/index.php?action=${action}`,{credentials:'same-origin',signal,...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
 let result;try{result=await response.json();}catch{throw new Error('Сервис записи временно недоступен. Обновите страницу.');}
 if(!response.ok){const e=new Error(result.error||'Не удалось выполнить запрос.');e.status=response.status;throw e;}
 return result;
}
export const money=price=>price==null?'По согласованию':new Intl.NumberFormat('ru-RU').format(price)+' ₽';
export const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
