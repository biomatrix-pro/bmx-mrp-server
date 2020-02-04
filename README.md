# bmx-mrp-server
MRP server app

# Алгоритм планирования ресурсов - MRP

Для работы алгоритма необходимо внесение следующих основных данных:

* **ресурсы**: материалы и сырье, которые используются в производстве продуктов
* **продукты**: перечень продукции, производство которой планируется
* **стадии**: схема производства продукции
* **начальные остатки ресурсов**: сколько ресурсов было на начало периода и сколько ресурсов находится в процессе 
доставки и прибудет несколько позднее начальной даты планирования
* **начальные остатки продукции**: сколько готовой продукции было на складе на начало периода, и какие партии 
продукции находятся в производстве на начало периода

Входящие данные алгоритма: количество продукции, которое нужно для сбыта на указанные даты - план продаж.

## Планы

План состоит из головного документа и элементов. 

План может быть основан на другом плане - тогда вся цепочка связанных планов обрабатывается совместно. Функция необходима для введения сценариев. 

## Ресурсы
 
Ресурсы - это материалы и сырье. Описание ресурса включает в себя:

* id: идентификатор ресурса
* caption: название ресурса
* unit: название единицы измерения ресурса
* minStock: минимальный остаток ресурсов, при котором заказывается следующая партия

Методы:
* обработать ресурсы в транзите - сформировать регистр остаток ресурсов с учетом поступления 
ресурсов из транзита. Посмотреть остатки можно через ресурс "resource-stock"
* получить остатки ресурсов на определенную дату.
* сделать заказ сырья к определенной дате: получить срок размещения заказа


## А2. Алгоритм

А2.1. Запускаем обработку при создании задачи планирования: в ней указаны планы, которые необходимо учитывать. Для выбранного плана получаем всю цепочку указанных планов и запоминаем ее для расчётов. Сохраняем событие о расчёте цепочки планов. 

А2.2. Обрабатываем ресурсы в транзите. Формируем регистр остатков ресурсов на определенные даты с учётом транзита. Для каждой операции указывается - какой план был основанием для операции. (2020): ресурсы в транзите записываются как записи в регистр остатков ресурсов с признаком: в транзите. 

А2.3. Обрабатываем продукцию в производстве. Для каждой партии в производстве: известна дата начала производства партии 
продукции. Требуется провести списание ресурсов и оприходование готовой продукции (количество готовой продукции должно быть указано в регистре продукции в производстве) по уже запущенным в производство 
партиям продукции - эти партии не планируются, но они будут фактически изготовлены и изменят остатки как ресурсов, 
так и продукции. Следовательно, это необходимо учесть. 

Берем текущую партию продукции в производстве. Берем этапы производства от самого первого до последнего. 
Для каждого этапа списываем ресурсы на производство продукции и по итогам фиксируем остатки продукции в результате 
производства. Если ресурсов не хватает на этап - фиксируем ошибку: невозможно было запустить производство в отсутствие необходимых ресурсов. Фиксируем - какой план был основанием для внесения данных. 

Начинаем обрабатывать план производства. Сортируем план в хронологическом порядке и по видам продукции. Обрабатываем каждую позицию плана от самой ранней к самой поздней. 

Берем текущую запись в плане. Вычисляем остаток продукции на эту дату. Сравниваем с потребностью в передаче продукции 
в продажи из текущей записи плана. Фиксируем ситуацию событием. Если продукции не хватает, необходимо будет запланировать производство партии 
продукции к дате в текущей записи плана. Фиксируем ошибку событием. 

Планируем производство партии продукции.   
Фиксируем планирование событием. Берем все этапы производства этой продукции. Сортируем в порядке следования прозводственных этапов, от 
самых первых этапов к последующим. 
Берем текущий этап. Производим вычисление даты начала этого этапа. Если дата меньше начальной даты в системе - 
пишем ошибку и прекращаем расчеты: система не может получить нужную продукцию к запланированной дате. 
Получаем список ресурсов, требуемых для данного этапа. 
Для каждого ресурса получаем остаток на дату начала этапа. Производим расчет требуемого объема ресурсов 
для данного производственного этапа. Если остатки ресурсов не позволяют начать этап, производим планирование 
поставки партии ресурсов. Если планирование поставки партии ресурсов по дате заказа меньше начальной даты в системе -
пишем ошибку и прекращаем процесс расчёта: система не может запланировать поставку ресурса к плановой дате.

Берём новые остатки ресурсов с учётом запланированной поставки. Если остатки ресурсов позволяют произвести продукцию, 
сохраняем данные о себестоимости производства и фиксируем расход ресурсов на производство. 

Вычислить дату начала этапа: дата конечная, продукция, этап. Сортируем этапы хронологически. От самого 
последнего этапа начинаем. Отнимаем от даты конечной длительность текущего этапа. Если это требуемый этап -
возвращаем дату начала. Если этапы кончились - ошибка. Иначе - берем предшествующий этап.

Планирование поставки партии ресурсов: на входе - дата поступления ресурсов и требуемое количество. 
Справочно указываем основание заказа (позиция в плане производства и этап). Получаем длительность перевозки и 
изготовления требуемого ресурса для расчёта даты заказа. На эту дату получаем - какой поставщик и условия поставки 
будут действовать. Проверяем уже открытые заказы этому поставщику: если партия от этого поставщика поступает в 
период, когда мы должны заказать эту партию ресурсов - то вместо заказа новой партии необходимо скорректировать ту 
поставку. Для этого каждая поставка должна содержать основания заказа и параметры (сколько заказано для выполнения 
производственного плана, а сколько заказано для получения минимальной партии поставки). Если нужно - планируем новую 
поставку и в соответствии с этими условиями записываем 
финансовые планы и требуемое количество ресурса для заказа. Записываем в список партий ресурсов эту партию
как заказанную (planned order). Основание заказа - план, продукция, этап. 

Получить остаток ресурсов на дату: берем перечень всех партий ресурсов в хронологическом 
порядке - от начальных остатков, остатков в транзите, и спланированных поставок. Далее получаем 
список всех расходных операций на дату. Соотносим приходные операции и расходные операции. Оставляем 
список всех партий, у которых остаток получился положительный - его и возвращем.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           

Списать ресурсы на произодство: продукция, этап, дата начала этапа. Берем список ресурсов, требуемый
для данного этапа. Для каждого ресурса берем текущий ресурс. Получаем остатки этого ресурса на дату. 
Делаем расчет требуемого количества ресурса на производство. Если ресурса не хватает - пишем об ошибке.
Если ресурса хватает, то для каждой партии ресурса на складе списываем имеющееся колчиество ресурсов 
из этой партии до тех пор, пока не наберем требуемое количество ресурсов.
   
## Важные замечания

Алгоритм не учитывает планирование продаж - план представляет собой сразу план производственных партий. 
Для учета плана продаж необходима агрегация планов продаж из различных источников, планирование остатка 
продукции, соотнесение их с планом продаж и планирование производственных партий.
   
