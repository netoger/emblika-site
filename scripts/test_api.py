"""Проверка сценариев записи на отдельном демонстрационном сервере."""
import concurrent.futures
import http.cookiejar
import json
import pathlib
import sys
import urllib.error
import urllib.request
import uuid
from datetime import date, timedelta

sys.stdout.reconfigure(encoding='utf-8')
BASE = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8092'

class Client:
    def __init__(self):
        self.opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf=self.call('session')[1]['csrf']
    def call(self,action,data=None,token=True):
        if data is not None:
            data=dict(data)
            if token:data['csrf']=self.csrf
        req=urllib.request.Request(BASE+'/api/index.php?action='+action,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
        try:
            with self.opener.open(req,timeout=20) as response:return response.status,json.load(response)
        except urllib.error.HTTPError as e:return e.code,json.load(e)

def check(condition,label):
    assert condition,label
    print('OK:',label)

guest=Client();admin=Client()
check(guest.call('dashboard')[0]==401,'Кабинет недоступен без авторизации')
check(guest.call('book',{},False)[0]==403,'POST без CSRF отклонён')
catalog=guest.call('catalog')[1]
service=catalog['services'][0]
day=(date.fromisoformat(catalog['today'])+timedelta(days=2)).isoformat()
master=json.loads(service['masters'])[0]
times=guest.call(f'slots&service={service["id"]}&master={master}&date={day}')[1]['times']
check(bool(times),'Получены свободные окна')
payload={'service':service['id'],'master':master,'date':day,'time':times[0],'name':'Тест API','phone':'70000000000','consent':True,'demoConsent':True,'requestId':str(uuid.uuid4())}
check(guest.call('book',{**payload,'consent':False})[0]==400,'Сервер проверяет согласие')
check(guest.call('book',{**payload,'phone':'123'})[0]==400,'Сервер проверяет телефон')
second=Client()
with concurrent.futures.ThreadPoolExecutor(2) as pool:
    futures=[pool.submit(client.call,'book',{**payload,'requestId':str(uuid.uuid4())}) for client in [guest,second]]
    results=[f.result() for f in futures]
check(sorted(r[0] for r in results)==[201,409],'Два запроса на одно время: создана только одна запись')
winner=next(r[1]['reference'] for r in results if r[0]==201)
remaining=guest.call(f'slots&service={service["id"]}&master={master}&date={day}')[1]['times']
check(times[0] not in remaining,'Занятое окно больше не предлагается')
settings={}
for line in pathlib.Path('.env').read_text(encoding='utf-8').splitlines():
    k,v=line.split('=',1);settings[k]=v.strip('"')
status,result=admin.call('login',{'username':settings['ADMIN_USER'],'password':settings['ADMIN_PASSWORD']})
check(status==200,'Авторизация администратора')
admin.csrf=result['csrf']
dashboard=admin.call('dashboard')[1]
record=next(a for a in dashboard['appointments'] if a['reference']==winner)
check(record['consent_version'] and record['consent_at'] and record['consent_ip'],'Согласие зафиксировано в базе')
check(admin.call('status',{'id':record['id'],'status':'confirmed'})[0]==200,'Подтверждение записи')
check(admin.call('shift',{'master':master,'date':day,'closed':True})[0]==400,'Нельзя закрыть смену с активной записью')
check(admin.call('status',{'id':record['id'],'status':'cancelled'})[0]==200,'Отмена записи')
remaining=guest.call(f'slots&service={service["id"]}&master={master}&date={day}')[1]['times']
check(times[0] in remaining,'После отмены окно снова свободно')
retry={**payload,'requestId':str(uuid.uuid4())}
created=guest.call('book',retry)
check(created[0]==201,'Освободившееся окно можно занять')
check(guest.call('book',retry)[1]['reference']==created[1]['reference'],'Повтор отправки не создаёт дубль')
check(admin.call('status',{'id':record['id'],'status':'confirmed'})[0]==409,'Отменённую запись нельзя восстановить поверх другой')
check(admin.call('service',{'id':service['id'],'name':service['name'],'price':service['price'],'duration':service['duration'],'active':True})[0]==200,'Сохранение услуги')
lead={'type':'training','topic':'Оформление бровей','name':'Тест API','phone':'70000000000','comment':'Проверка','consent':True,'demoConsent':True,'requestId':str(uuid.uuid4())}
check(guest.call('lead',{**lead,'consent':False})[0]==400,'Заявка: сервер проверяет согласие')
check(guest.call('lead',{**lead,'type':'spam'})[0]==400,'Заявка: неизвестный тип отклонён')
check(guest.call('lead',{**lead,'phone':'123'})[0]==400,'Заявка: сервер проверяет телефон')
check(guest.call('lead',lead,False)[0]==403,'Заявка без CSRF отклонена')
sent=guest.call('lead',lead)
check(sent[0]==201 and sent[1]['reference'].startswith('ОБ-'),'Заявка на обучение сохранена')
check(guest.call('lead',lead)[1]['reference']==sent[1]['reference'],'Повтор отправки заявки не создаёт дубль')
check(guest.call('lead',{**lead,'type':'client','topic':'Помочь выбрать услугу','requestId':str(uuid.uuid4())})[0]==201,'Заявка клиента сохранена')
leads=[l for l in admin.call('dashboard')[1]['leads'] if l['name']=='Тест API']
check(len(leads)==2,'Заявки видны в кабинете')
check(admin.call('lead_status',{'id':leads[0]['id'],'status':'contacted'})[0]==200,'Смена статуса заявки')
check(admin.call('lead_status',{'id':leads[0]['id'],'status':'bad'})[0]==400,'Неизвестный статус заявки отклонён')
for l in leads:check(admin.call('lead_delete',{'id':l['id']})[0]==200,'Удалена синтетическая заявка')
for a in admin.call('dashboard')[1]['appointments']:
    if a['name']=='Тест API':check(admin.call('delete',{'id':a['id']})[0]==200,'Удалена синтетическая тестовая запись')
check(admin.call('logout',{})[0]==200 and admin.call('dashboard')[0]==401,'Выход закрывает доступ')
for path in ['/app/.env','/app/data/emblika.sqlite','/app/bootstrap.php']:
    try:
        urllib.request.build_opener(urllib.request.ProxyHandler({})).open(BASE+path)
        raise AssertionError('Служебный путь открыт: '+path)
    except urllib.error.HTTPError as e:check(e.code==403,'Закрыт путь '+path)
print('Все интеграционные проверки пройдены.')
