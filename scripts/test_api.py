"""Проверка сценариев записи на отдельном демонстрационном сервере."""
import concurrent.futures
import http.cookiejar
import json
import pathlib
import sys
import urllib.error
import urllib.request
import uuid
import struct
import zlib
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

def png(width,height):
    # Однотонная PNG-картинка без сторонних библиотек — для проверки загрузки фото.
    raw=b''.join(b'\x00'+b'\x4f\x9a\x6c'*width for _ in range(height))
    chunk=lambda kind,data:struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')

def multipart(client,action,fields,files):
    boundary='----emblika'+uuid.uuid4().hex
    body=b''
    for k,v in fields.items():body+=f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k,(name,data,kind) in files.items():body+=f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{name}"\r\nContent-Type: {kind}\r\n\r\n'.encode()+data+b'\r\n'
    body+=f'--{boundary}--\r\n'.encode()
    req=urllib.request.Request(BASE+'/api/index.php?action='+action,data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary})
    try:
        with client.opener.open(req,timeout=20) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as e:return e.code,json.load(e)

def fetch(path):
    try:
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(BASE+path,timeout=20) as r:return r.status,r.read()
    except urllib.error.HTTPError as e:return e.code,b''

def check(condition,label):
    assert condition,label
    print('OK:',label)

guest=Client();admin=Client()
check(guest.call('dashboard')[0]==401,'Кабинет недоступен без авторизации')
check(guest.call('book',{},False)[0]==403,'POST без CSRF отклонён')
catalog=guest.call('catalog')[1]
service=catalog['services'][0]
names={s['name']:s for s in catalog['services']}
check(all(k in service for k in ('image','mode')),'Миграция: у услуг есть фото и способ записи')
check(all(names.get(n,{}).get('mode')=='request' for n in ('Чистка лица','Пилинг','Радиочастотный (RF) лифтинг лица','Уходовые процедуры для волос','Аппаратная коррекция фигуры')),'Новые процедуры добавлены и принимаются по заявке')
check(not any(s['category']=='Уход за лицом' for s in catalog['services']),'Раздел «Уход за лицом» переименован в косметологию')
body_service=names['Аппаратная коррекция фигуры']
day=(date.fromisoformat(catalog['today'])+timedelta(days=2)).isoformat()
master=json.loads(service['masters'])[0]
times=guest.call(f'slots&service={service["id"]}&master={master}&date={day}')[1]['times']
check(bool(times),'Получены свободные окна')
check(guest.call(f'slots&service={body_service["id"]}&master={master}&date={day}')[1]['times']==[],'Услуга «только заявка» не предлагает время')
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
check(all(s['end_time']=='20:00' for s in dashboard['shifts']),'Смены продлены до 20:00')
keep={'id':service['id'],'name':service['name'],'category':service['category'],'description':service['description'],'price':service['price'],'duration':service['duration'],'masters':json.loads(service['masters']),'mode':'booking','active':True}
check(admin.call('service',keep)[0]==200,'Сохранение услуги')
check(admin.call('service',{**keep,'masters':[]})[0]==400,'Онлайн-запись без мастера отклонена')
check(admin.call('service',{**keep,'masters':[999]})[0]==400,'Неизвестный мастер отклонён')
created_service=admin.call('service',{**keep,'id':0,'name':'Тест API комплекс','category':'Комплексы','price':3000,'mode':'request','masters':[]})
check(created_service[0]==200 and created_service[1]['id']>0,'Создание услуги в кабинете')
new_id=created_service[1]['id']
check(any(s['id']==new_id and s['category']=='Комплексы' for s in guest.call('catalog')[1]['services']),'Новая услуга сразу видна в каталоге')
check(multipart(guest,'service_image',{'csrf':guest.csrf,'id':new_id},{'image':('a.png',png(300,300),'image/png')})[0]==401,'Фото без входа в кабинет отклонено')
check(multipart(admin,'service_image',{'csrf':'wrong','id':new_id},{'image':('a.png',png(300,300),'image/png')})[0]==403,'Фото без CSRF отклонено')
check(multipart(admin,'service_image',{'csrf':admin.csrf,'id':new_id},{'image':('a.php',b'<?php echo 1;',"image/png")})[0]==400,'Не-картинка отклонена')
check(multipart(admin,'service_image',{'csrf':admin.csrf,'id':new_id},{'image':('a.png',png(50,50),'image/png')})[0]==400,'Слишком маленькое фото отклонено')
uploaded=multipart(admin,'service_image',{'csrf':admin.csrf,'id':new_id},{'image':('a.png',png(1600,900),'image/png')})
check(uploaded[0]==200 and uploaded[1]['image'].endswith('.jpg'),'Фото загружено и перекодировано в JPG')
status,data=fetch(uploaded[1]['image'])
check(status==200 and data[:2]==b'\xff\xd8','Фото доступно на сайте')
replaced=multipart(admin,'service_image',{'csrf':admin.csrf,'id':new_id},{'image':('b.png',png(400,400),'image/png')})
check(replaced[0]==200 and fetch(uploaded[1]['image'])[0]==404,'Замена фото удаляет старый файл')
check(admin.call('service_delete',{'id':new_id})[0]==200 and fetch(replaced[1]['image'])[0]==404,'Удаление услуги удаляет её фото')
check(admin.call('service_delete',{'id':service['id']})[0]==409,'Услугу с записями удалить нельзя')
lead={'type':'training','topic':'Оформление бровей','name':'Тест API','phone':'70000000000','comment':'Проверка','consent':True,'demoConsent':True,'requestId':str(uuid.uuid4())}
check(guest.call('lead',{**lead,'consent':False})[0]==400,'Заявка: сервер проверяет согласие')
check(guest.call('lead',{**lead,'type':'spam'})[0]==400,'Заявка: неизвестный тип отклонён')
check(guest.call('lead',{**lead,'phone':'123'})[0]==400,'Заявка: сервер проверяет телефон')
check(guest.call('lead',lead,False)[0]==403,'Заявка без CSRF отклонена')
sent=guest.call('lead',lead)
check(sent[0]==201 and sent[1]['reference'].startswith('ОБ-'),'Заявка на обучение сохранена')
check(guest.call('lead',lead)[1]['reference']==sent[1]['reference'],'Повтор отправки заявки не создаёт дубль')
check(guest.call('lead',{**lead,'type':'client','topic':'Помочь выбрать услугу','requestId':str(uuid.uuid4())})[0]==201,'Заявка клиента сохранена')
body=guest.call('lead',{**lead,'type':'body','topic':'Аппаратная коррекция фигуры','requestId':str(uuid.uuid4())})
check(body[0]==201 and body[1]['reference'].startswith('КФ-'),'Заявка на коррекцию фигуры сохранена')
leads=[l for l in admin.call('dashboard')[1]['leads'] if l['name']=='Тест API']
check(len(leads)==3,'Заявки видны в кабинете')
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
