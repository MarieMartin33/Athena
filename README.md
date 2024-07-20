# see also

OHDSI [Usagi](https://github.com/OHDSI/Usagi)
Interhop [Susana](https://framagit.org/interhop/omop/susana)

# About this documentation

OMOP needs a real terminology manager. Best of all worlds (susana+usagi+susana+fhir) should be unified.

Athena uses PostgreSQL, Solr, Spring boot and react (AthenaUI).
Its installation is not really documented. This is the point of this fork.
As athena didn't update for years, it is the occasion to see how far it is from up-to-date libraries.

# Compile and install

java 17

pom.xml
```
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.5.7</version>
        <relativePath/>
    </parent>

```

```
    <properties>
        <java.version>17</java.version>
        <lombok.version>1.18.32</lombok.version>
        <maven.compiler.source>${java.version}</maven.compiler.source>
        <maven.compiler.target>${java.version}</maven.compiler.target>
    </properties>

```

Compile and install:
tests will fail with fail under java 17 (lombok and so on). No time to port the tests.
So skip their compilation and their execution:

```
mvn clean install -DskipTests=true "-Dmaven.test.skip=true"

```

Install and launch PostgreSQL:

read [postgresql doc](https://github.com/docker-library/docs/blob/master/postgres/README.md) 

docker pull postgres:17beta2-alpine

docker run -d --name athena-postgres -p 5432:5432 -e POSTGRES_PASSWORD=athenapwd -e POSTGRES_USER=athena -e PGDATA=/var/lib/postgresql/data/pgdata -e POSTGRES_DB=athena -v c:\repos\github\Athena\pgdata:/var/lib/postgresql/data postgres:17beta2-alpine

Install [pgadmin](https://ftp.postgresql.org/pub/pgadmin/pgadmin4/v8.9/windows/pgadmin4-8.9-x64.exe)

Configure and launch SOLR:
Inspired by [solr configuration](https://github.com/OHDSI/WebAPI/pull/1091#issuecomment-565163067): 

Edit athena/application.properties:

Change:
athena.solr.core.name=concepts
to:
athena.solr.core.name=athena

Created 2 directories for the core:
mkdir C:\Apps\solr-8.11.3\server\solr\athena
mkdir C:\Apps\solr-8.11.3\server\solr\athena\index
mkdir C:\Apps\solr-8.11.3\server\solr\athena\data

cp https://jdbc.postgresql.org/download/postgresql-42.7.3.jar to C:\Apps\solr-8.11.3\server\lib

cp C:\repos\github\Athena\src\main\resources\solr\* C:\Apps\solr-8.11.3\server\solr\athena\.

"managed-schema" is a xml file that has some dependencies such as stop words, all under the lang folder, such as references to lang/contractions_it.txt.
so:

cp  C:\Apps\solr-8.11.3\example\example-DIH\solr\db\conf C:\Apps\solr-8.11.3\server\solr\athena\conf
(or from C:\Apps\solr-8.11.3\example\files\conf\?)
remove
C:\Apps\solr-8.11.3\server\solr\athena\conf\db-data-config.xml
C:\Apps\solr-8.11.3\server\solr\athena\conf\managed-schema
C:\Apps\solr-8.11.3\server\solr\athena\conf\solrconfig.xml
as they are provided by athena in C:\repos\github\Athena\src\main\resources\solr\ and copied into C:\Apps\solr-8.11.3\server\solr\athena\


edit the files in C:\Apps\solr-8.11.3\server\solr\athena\:
solrconfig.xml
``` xml
<requestHandler name="/dataimport" class="solr.DataImportHandler">
    <lst name="defaults">
      <str name="config">data-config.xml</str>
      <lst name="datasource">
        <str name="name">athena_cdm_v5</str>
        <str name="driver">org.postgresql.Driver</str>
        <str name="url">jdbc:postgresql://localhost:5432/athena_cdm_v5</str>
        <str name="user">athena</str>
        <str name="password">athenapwd</str>
     </lst>
  </lst>
</requestHandler>
```



data-config.xml: Edit the data source & references in the query to match the database holding your vocabulary

``` xml
<dataConfig>
 <document name='concepts'>
   <entity name="concept" <<<<====== will be used in solr webUI
           dataSource="athena_cdm_v5"
           pk="concept_id"
        ...
   </entity>
 </document>
</dataConfig>
```

core.properties: Edit the name to match the directory:
```
config=solrconfig.xml
dataDir=data
name=athena
schema=managed-schema
```

start solr on port 8984:
``` bash
C:\Apps\solr-8.11.3\bin\solr.cmd start -p 8984
```

stop solr:
``` bash
C:\Apps\solr-8.11.3\bin\solr.cmd stop -all
```

insert concept data in athena_cdm_v5 tables

refresh data into materialized view:
pgadmin > concepts_view > right click > refresh data > with data

reindex data in solr:
Core selector : "athena"
http://127.0.0.1:8984/solr/#/athena/dataimport//dataimport
> full-import
> verbose, clean, commit, optimize, debug
> entity: "concept"
> Start, Rows: 0 to 200 000
verify:
> query
> select
> http://127.0.0.1:8984/solr/#/athena/query?q=*:*&q.op=OR&indent=true


Launch Athena:
``` bash
java "-Dspring.main.allow-bean-definition-overriding=true" -jar .\target\athena.jar
``` 

Use Athena:
http://localhost:3010/search-terms/terms?query=&boosts&page=1
> search
> necker

api:
Frontend API si JSON-based but not FHIR. Rework should make it FHIR compatible.

http://localhost:3010/api/v1/concepts?pageSize=15&page=1&query=necker
``` json
{"content":[{"id":868093451,"code":"750721334","name":"NECKER","className":"FINESS_219","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868124895,"code":"750059701","name":"NECKER","className":"FINESS_219","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868357633,"code":"750026833","name":"PHARMACIE NECKER","className":"FINESS_620","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868370119,"code":"750026825","name":"PHARMACIE NECKER","className":"FINESS_620","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868283785,"code":"930009485","name":"PHARMACIE NECKER PASTEUR","className":"FINESS_620","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868387742,"code":"930009477","name":"PHARMACIE NECKER PASTEUR","className":"FINESS_620","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868006283,"code":"750026767","name":"SELARL PHARMACIE NECKER","className":"FINESS_620","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868169855,"code":"750026742","name":"SELARL PHARMACIE NECKER","className":"FINESS_620","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868294845,"code":"750833337","name":"CMP ENFANTS NECKER","className":"FINESS_156","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868300069,"code":"750712184","name":"CMP ENFANTS NECKER","className":"FINESS_156","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868006629,"code":"750055048","name":"EFS IDF SITE NECKER","className":"FINESS_132","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868115848,"code":"930019229","name":"EFS IDF SITE NECKER","className":"FINESS_132","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868178678,"code":"750712184","name":"GHU CUP SITE NECKER ENFANTS MALADES","className":"FINESS_101","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868253977,"code":"750100208","name":"GHU CUP SITE NECKER ENFANTS MALADES","className":"FINESS_101","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null},{"id":868133134,"code":"750062648","name":"MAH MAISON DE FAMILLE ST JEAN NECKER","className":"FINESS_271","standardConcept":"Non-standard","invalidReason":"Valid","domain":"Care site","vocabulary":"FINESS","score":null}],"pageable":{"sort":{"empty":true,"unsorted":true,"sorted":false},"offset":15,"pageSize":15,"pageNumber":1,"paged":true,"unpaged":false},"facets":{"domain_id":{"Care site":24},"standard_concept":{"Non-standard":24},"concept_class_id":{"FINESS_101":2,"FINESS_132":2,"FINESS_156":4,"FINESS_219":2,"FINESS_271":2,"FINESS_500":2,"FINESS_620":10,"FINESS_1000":0,"FINESS_106":0,"FINESS_109":0,"FINESS_1100":0,"FINESS_1101":0,"FINESS_1102":0,"FINESS_1103":0,"FINESS_1104":0,"FINESS_1106":0,"FINESS_1107":0,"FINESS_1109":0,"FINESS_1110":0,"FINESS_1111":0,"FINESS_114":0,"FINESS_115":0,"FINESS_1200":0,"FINESS_1201":0,"FINESS_1203":0,"FINESS_1205":0,"FINESS_122":0,"FINESS_124":0,"FINESS_126":0,"FINESS_127":0,"FINESS_128":0,"FINESS_129":0,"FINESS_131":0,"FINESS_141":0,"FINESS_142":0,"FINESS_143":0,"FINESS_146":0,"FINESS_159":0,"FINESS_161":0,"FINESS_165":0,"FINESS_166":0,"FINESS_172":0,"FINESS_175":0,"FINESS_176":0,"FINESS_177":0,"FINESS_178":0,"FINESS_180":0,"FINESS_182":0,"FINESS_183":0,"FINESS_186":0,"FINESS_188":0,"FINESS_189":0,"FINESS_190":0,"FINESS_192":0,"FINESS_194":0,"FINESS_195":0,"FINESS_196":0,"FINESS_197":0,"FINESS_198":0,"FINESS_2000":0,"FINESS_202":0,"FINESS_207":0,"FINESS_208":0,"FINESS_209":0,"FINESS_2100":0,"FINESS_2103":0,"FINESS_213":0,"FINESS_214":0,"FINESS_216":0,"FINESS_2200":0,"FINESS_2201":0,"FINESS_2202":0,"FINESS_2204":0,"FINESS_2205":0,"FINESS_2206":0,"FINESS_221":0,"FINESS_223":0,"FINESS_224":0,"FINESS_228":0,"FINESS_230":0,"FINESS_231":0,"FINESS_236":0,"FINESS_238":0,"FINESS_241":0,"FINESS_246":0,"FINESS_247":0,"FINESS_249":0,"FINESS_252":0,"FINESS_253":0,"FINESS_255":0,"FINESS_256":0,"FINESS_257":0,"FINESS_258":0,"FINESS_259":0,"FINESS_266":0,"FINESS_267":0,"FINESS_268":0,"FINESS_269":0,"FINESS_270":0,"FINESS_286":0,"FINESS_292":0,"FINESS_294":0,"FINESS_295":0,"FINESS_300":0,"FINESS_3000":0,"FINESS_3100":0,"FINESS_3101":0,"FINESS_3200":0,"FINESS_3201":0,"FINESS_330":0,"FINESS_340":0,"FINESS_3400":0,"FINESS_3401":0,"FINESS_3405":0,"FINESS_3406":0,"FINESS_3407":0,"FINESS_341":0,"FINESS_342":0,"FINESS_344":0,"FINESS_346":0,"FINESS_347":0,"FINESS_354":0,"FINESS_355":0,"FINESS_362":0,"FINESS_365":0,"FINESS_366":0,"FINESS_368":0,"FINESS_370":0,"FINESS_374":0,"FINESS_377":0,"FINESS_378":0,"FINESS_379":0,"FINESS_380":0,"FINESS_381":0,"FINESS_382":0,"FINESS_390":0,"FINESS_395":0,"FINESS_396":0,"FINESS_4000":0,"FINESS_402":0,"FINESS_4100":0,"FINESS_4101":0,"FINESS_4102":0,"FINESS_4103":0,"FINESS_4104":0,"FINESS_4105":0,"FINESS_4106":0,"FINESS_4107":0,"FINESS_411":0,"FINESS_412":0,"FINESS_415":0,"FINESS_418":0,"FINESS_422":0,"FINESS_425":0,"FINESS_426":0,"FINESS_427":0,"FINESS_430":0,"FINESS_4300":0,"FINESS_4301":0,"FINESS_4302":0,"FINESS_4303":0,"FINESS_4304":0,"FINESS_4305":0,"FINESS_433":0,"FINESS_436":0,"FINESS_437":0,"FINESS_438":0,"FINESS_440":0,"FINESS_4400":0,"FINESS_4401":0,"FINESS_4402":0,"FINESS_4403":0,"FINESS_4404":0,"FINESS_441":0,"FINESS_442":0,"FINESS_443":0,"FINESS_444":0,"FINESS_445":0,"FINESS_446":0,"FINESS_448":0,"FINESS_449":0,"FINESS_450":0,"FINESS_4500":0,"FINESS_4501":0,"FINESS_4502":0,"FINESS_4504":0,"FINESS_4505":0,"FINESS_451":0,"FINESS_453":0,"FINESS_460":0,"FINESS_4600":0,"FINESS_4601":0,"FINESS_4602":0,"FINESS_4603":0,"FINESS_4604":0,"FINESS_4605":0,"FINESS_4606":0,"FINESS_4607":0,"FINESS_4608":0,"FINESS_4609":0,"FINESS_461":0,"FINESS_462":0,"FINESS_463":0,"FINESS_464":0,"FINESS_5000":0,"FINESS_501":0,"FINESS_502":0,"FINESS_5100":0,"FINESS_5104":0,"FINESS_6000":0,"FINESS_603":0,"FINESS_604":0,"FINESS_610":0,"FINESS_6100":0,"FINESS_6101":0,"FINESS_611":0,"FINESS_612":0,"FINESS_6200":0,"FINESS_6201":0,"FINESS_624":0,"FINESS_627":0,"FINESS_628":0,"FINESS_629":0,"FINESS_630":0,"FINESS_6300":0,"FINESS_6301":0,"FINESS_631":0,"FINESS_632":0,"FINESS_633":0,"FINESS_636":0,"FINESS_695":0,"FINESS_696":0,"FINESS_697":0,"FINESS_698":0,"FINESS_699":0,"Point of care":0},"vocabulary_id":{"FINESS":24},"invalid_reason":{"Valid":24}},"query":null,"debug":null,"totalPages":2,"totalElements":24,"last":true,"numberOfElements":15,"size":15,"number":1,"sort":{"empty":true,"unsorted":true,"sorted":false},"first":false,"empty":false}
```

http://localhost:3010/api/v1/concepts/868006283

``` json
{"id":868006283,"name":"SELARL PHARMACIE NECKER","domainId":"Care site","conceptClassId":"FINESS_620","vocabularyId":"FINESS","standardConcept":"Classification","conceptCode":"750026767","validStart":"1969-12-31T23:00:00.000+00:00","validEnd":"2099-12-30T23:00:00.000+00:00","invalidReason":"Valid","synonyms":["SELARL PHARMACIE NECKER"],"validTerm":null,"vocabularyName":"FINESS","vocabularyVersion":null,"vocabularyReference":"MMA33 Generated","_links":{"self":{"href":"http://localhost:3010/api/v1/concepts/868006283"}}}
```


## Athena UI
See https://github.com/OHDSI/AthenaUI/

cool (react) but old, the has technical debt. no time to port it.

It calls a web analytics tool. to remove it, edit src\main\resources\public\app.1fdfbf6aa293d95998ec.js
comment the call:

``` json
t.StartAnalytics=function(){r.Gtagger.initialize("UA-116831829-1")}
=>
t.StartAnalytics=function(){/*r.Gtagger.initialize("UA-116831829-1")*/}
```

# 1 Phrase search

Search provides the ability to search by phrase. All results are sorted by default according to the following criteria:

 -full phrase match 
- concepts contain all the words from the search phrase
- result based on two parameters, the number of searched words in the result and importance of each word (importance is calculated for each word, the words that are rearer among all documents are more important)

Example:

Search phrase: **Stroke Myocardial Infarction Gastrointestinal Bleeding**

Name | sort priority explanation |
---- | ---- |
Stroke Myocardial Infarction Gastrointestinal Bleeding| full match  |
Gastrointestinal Bleeding Myocardial Infarction Stroke| all words |
Stroke Myocardial Infarction  Gastrointestinal Bleeding and Renal Dysfunction| 3 words |
Stroke Myocardial Infarction Bleeding in Back| 2 words |
Bleeding in Back Gastrointestinal Bleeding| 2 word |
Stroke Myocardial Infarction| 2 word |
Stroke Myocardial Infarction Strok| 2 words |
Stroke Myocardial Infarction Stroke Nothin| 2 words |
Stroke Myocardial Infarction  Renal Dysfunction| 2 words |
Stroke Myocardial Infarction Renal Dysfunction and Nothing| 1 words |
stroke| 1 words |
Stroke| 1 words |
Strook| 1 words |


NB: the search goes through all concept fields, but the highest priority is given to CONCEPT_NAME and CONCEPT_CODE

# 2 Exact search

Using quotation marks forces an exact-match search. 

For an exact search, the following conditions are met
- the word must be present
- not case sensitive, the number of spaces between words does not matter
- stemming is disabled(the word/words must be present exactly as it is in quotation marks)

Example 1:

Search phrase: **"Stroke Myocardial Infarction Gastrointestinal Bleeding"**

Name |
--- | 
Stroke Myocardial Infarction Gastrointestinal Bleeding |
Stroke Myocardial Infarction  Gastrointestinal Bleeding and Renal Dysfunction |

Example 2:

Search phrase:  **"Stroke Myocardial Infarction "Gastrointestinal Bleeding"**

Name |
--- |
Stroke Myocardial Infarction Gastrointestinal Bleeding |
Gastrointestinal Bleeding Myocardial Infarction Stroke |
Stroke Myocardial Infarction  Gastrointestinal Bleeding and Renal Dysfunction |
Bleeding in Back Gastrointestinal Bleeding |

# 3 Special symbols

For special symbols, the following conditions are met
- These special symbols are always ignored and treated as words separation symbols: / \ | ? ! , ;   .
  e.g. "Pooh.eats?honey!" equals "Pooh eats honey" 
- All other special symbols ignored only if it is a separate word: + - ( ) : ^ [ ] { } ~ * ? | & ;
  e.g. "Pooh ` eats raspberries - honey" equals "Pooh eats honey", but "Pooh'eats raspberries-honey" will remain the same  
- the first funded result will be with characters and then without

Search phrase: **[hip]**

Name |
--- |
[hip] fracture risk |
[Hip] fracture risk |
[hip fracture risk |
hip] fracture risk |
(hip fracture risk |
(hip) fracture risk |
hip fracture risk |
hip) fracture risk |
hip} fracture risk |
hip} fracture risk |
{hip fracture risk |


A special character becomes mandatory if the word is surrounded by quotation marks.

Search phrase:  **"[hip]"**

Name |
--- |
[hip] fracture risk | 
[Hip] fracture risk | 


# 4 Approximate matching (fuzzy searching)

In case of a typo, or if there is a similar spelling of the word, the most similar result will be found

Search phrase: **Strok Myocardi8 Infarctiin Gastrointestinal Bleedi**

Name |
--- | 
Gastrointestinal Bleeding Myocardial Infarction Stroke|
Stroke Myocardial Infarction Gastrointestinal Bleeding|
Stroke Myocardial Infarction  Gastrointestinal Bleeding and Renal Dysfunction|
Stroke Myocardial Infarction Strok|
Bleeding in Back Gastrointestinal Bleeding|
Stroke Myocardial Infarction Bleeding in Back|
Stroke Myocardial Infarction|
Stroke Myocardial Infarction Stroke Nothin|
Stroke Myocardial Infarction  Renal Dysfunction|
Stroke Myocardial Infarction Renal Dysfunction and Nothing|
stroke|
Stroke|
Stroo |


# 1 Customize query


## Activate customizing search query mode
You can activate this  mode by adding `debug=true` params in url
https://qaathena.odysseusinc.com/search-terms/terms?debug=true

* the text input field for the boost object will appear below the search input
* the score column will be appeared
* the generated solr requests and score calculation information will be printed to the browser console (to see it, open developer tools by F12). if the  solr-request/score has not changed then this info will not be printed


## Boosts object
We use an object with boosts in order to configure the solr search query:
```json
{
    "notExactTerm": {
        "conceptNameText": 500,
        "conceptCodeText": 500,
        "conceptSynonymNameText": 200,
        "querySymbols": 10,
        "conceptCodeTextFuzzy": 50,
        "conceptNameTextFuzzy": 50,
        "conceptSynonymNameFuzzy": 20,
        "querySymbolsFuzzy": 1
    },
    "asteriskTermBoosts": {
        "conceptSynonymName": 40000,
        "conceptNameCi": 25000,
        "conceptNameText": 8000,
        "conceptCodeText": 10000,
        "conceptName": 60000,
        "conceptSynonymNameText": 5000,
        "conceptSynonymNameCi": 20000,
        "conceptCodeCi": 30000,
        "conceptCode": 80000
    },
    "phrase": {
        "conceptSynonymName": 40000,
        "conceptNameCi": 1000,
        "conceptName": 60000,
        "domainIdCi": 100,
        "conceptSynonymNameCi": 500,
        "conceptCodeCi": 10000,
        "conceptCode": 80000,
        "conceptClassIdCi": 100,
        "conceptId": 100000,
        "vocabularyIdCi": 100
    },
    "singleNotExactTermBoosts": {
        "conceptCodeText": 500,
        "conceptCodeTextFuzzy": 50
    },
    "exactTerm": {
        "conceptSynonymName": 40000,
        "conceptNameCi": 1000,
        "conceptName": 60000,
        "conceptSynonymNameCi": 500,
        "conceptCodeCi": 10000,
        "conceptCode": 80000,
        "conceptId": 100000,
        "querySymbols": 10
    },
    "singleExactTermBoosts": {
        "conceptCodeCi": 10000,
        "conceptCode": 80000
    },
    "singleAsteriskTermBoosts": {
        "conceptCodeText": 10000,
        "conceptCodeCi": 30000,
        "conceptCode": 80000
    }
}

```
## Query examples 
examples of generated solr queries:

**query string** : aspirin
```sql
( --phrase
    concept_code:aspirin^80000 OR
    concept_name:aspirin^60000 OR
    concept_synonym_name:aspirin^40000 OR
    concept_code_ci:aspirin^10000 OR
    concept_name_ci:aspirin^1000 OR
    concept_synonym_name_ci:aspirin^500 OR
    concept_class_id_ci:aspirin^100 OR
    domain_id_ci:aspirin^100 OR
    vocabulary_id_ci:aspirin^100
) 
OR
( -- single notExactTerm
    concept_code_text:aspirin^40000 OR
    concept_code_text:aspirin~0.7^30000
) 
OR
( -- notExactTerm
    concept_code_text:aspirin^50 OR
    concept_code_text:aspirin~0.7^40 OR
    concept_name_text:aspirin^50 OR
    concept_name_text:aspirin~0.7^40 OR
    concept_synonym_name_text:aspirin^25 OR
    query_wo_symbols:aspirin^10
)


```
**query string**: "aspirin"
```sql
( --phrase
    concept_code:aspirin^80000 OR
    concept_name:aspirin^60000 OR
    concept_synonym_name:aspirin^40000 OR
    concept_code_ci:aspirin^10000 OR
    concept_name_ci:aspirin^1000 OR
    concept_synonym_name_ci:aspirin^500 OR
    concept_class_id_ci:aspirin^100 OR
    domain_id_ci:aspirin^100 OR
    vocabulary_id_ci:aspirin^100
)
OR
( --single exactTerm  
    concept_code:aspirin^80000 OR
    concept_code_ci:aspirin^10000
)
OR
( --exactTerm
    concept_code:"aspirin"^80000 OR
    concept_name:"aspirin"^60000 OR
    concept_synonym_name:"aspirin"^40000 OR
    concept_code_ci:"aspirin"^10000 OR
    concept_name_ci:"aspirin"^1000 OR
    concept_synonym_name_ci:"aspirin"^500 OR
    query:"aspirin"^1
)

```
**query string**: "45957786" (in case we are searching an exact number the field 'concept_id' is added)
```sql
( --phrase
    concept_code:45957786^80000 OR
    concept_name:45957786^60000 OR
    concept_synonym_name:45957786^40000 OR
    concept_code_ci:45957786^10000 OR
    concept_name_ci:45957786^1000 OR
    concept_synonym_name_ci:45957786^500 OR
    concept_class_id_ci:45957786^100 OR
    domain_id_ci:45957786^100 OR
    vocabulary_id_ci:45957786^100 OR
    concept_id:45957786^100000
) 
OR
( -- single exactTerm
    concept_code:45957786^80000 OR
    concept_code_ci:45957786^10000
) 
OR
(-- exactTerm
    concept_code:"45957786"^80000 OR
    concept_name:"45957786"^60000 OR
    concept_synonym_name:"45957786"^40000 OR
    concept_code_ci:"45957786"^10000 OR
    concept_name_ci:"45957786"^1000 OR
    concept_synonym_name_ci:"45957786"^500 OR
    query:"45957786"^1 OR
    concept_id:45957786^100000
)
```

**query string**: aspirin paracetamol
```sql
( --phrase
    concept_code:aspirin\ paracetamol^80000 OR
    concept_name:aspirin\ paracetamol^60000 OR
    concept_synonym_name:aspirin\ paracetamol^40000 OR
    concept_code_ci:aspirin\ paracetamol^10000 OR
    concept_name_ci:aspirin\ paracetamol^1000 OR
    concept_synonym_name_ci:aspirin\ paracetamol^500 OR
    concept_class_id_ci:aspirin\ paracetamol^100 OR
    domain_id_ci:aspirin\ paracetamol^100 OR
    vocabulary_id_ci:aspirin\ paracetamol^100
) 
OR
(
    ( --notExactTerm
        concept_code_text:aspirin^50 OR
        concept_code_text:aspirin~0.7^40 OR
        concept_name_text:aspirin^50 OR
        concept_name_text:aspirin~0.7^40 OR
        concept_synonym_name_text:aspirin^25 OR
        query_wo_symbols:aspirin^10
    ) 
    OR
    (--notExactTerm
        concept_code_text:paracetamol^50 OR
        concept_code_text:paracetamol~0.7^40 OR
        concept_name_text:paracetamol^50 OR
        concept_name_text:paracetamol~0.7^40 OR
        concept_synonym_name_text:paracetamol^25 OR
        query_wo_symbols:paracetamol^10
    )
)
```
**query string**: aspirin "paracetamol"
```sql
( --phrase
    concept_code:aspirin\ paracetamol^80000 OR
    concept_name:aspirin\ paracetamol^60000 OR
    concept_synonym_name:aspirin\ paracetamol^40000 OR
    concept_code_ci:aspirin\ paracetamol^10000 OR
    concept_name_ci:aspirin\ paracetamol^1000 OR
    concept_synonym_name_ci:aspirin\ paracetamol^500 OR
    concept_class_id_ci:aspirin\ paracetamol^100 OR
    domain_id_ci:aspirin\ paracetamol^100 OR
    vocabulary_id_ci:aspirin\ paracetamol^100
) 
OR
(
    (  -- exactTerm
        concept_code:"paracetamol"^80000 OR
        concept_name:"paracetamol"^60000 OR
        concept_synonym_name:"paracetamol"^40000 OR
        concept_code_ci:"paracetamol"^10000 OR
        concept_name_ci:"paracetamol"^1000 OR
        concept_synonym_name_ci:"paracetamol"^500 OR
        query:"paracetamol"^1
    ) 
    OR
    (
        (  -- exactTerm
            concept_code:"paracetamol"^80000 OR
            concept_name:"paracetamol"^60000 OR
            concept_synonym_name:"paracetamol"^40000 OR
            concept_code_ci:"paracetamol"^10000 OR
            concept_name_ci:"paracetamol"^1000 OR
            concept_synonym_name_ci:"paracetamol"^500 OR
            query:"paracetamol"^1
        ) 
        AND 
        ( --notExactTerm
            concept_code_text:aspirin^50 OR
            concept_code_text:aspirin~0.7^40 OR
            concept_name_text:aspirin^50 OR
            concept_name_text:aspirin~0.7^40 OR
            concept_synonym_name_text:aspirin^25 OR
            query_wo_symbols:aspirin^10
        )
    )
)

```
Requirement for search with an asterisk:

**query string**: aspirin* ibupro*

**result**:
```sql   
( --phrase
    concept_code:aspirin\*\ ibupro\*^80000 OR
    concept_name:aspirin\*\ ibupro\*^60000 OR
    concept_synonym_name:aspirin\*\ ibupro\*^40000 OR
    concept_code_ci:aspirin\*\ ibupro\*^10000 OR
    concept_name_ci:aspirin\*\ ibupro\*^1000 OR
    concept_synonym_name_ci:aspirin\*\ ibupro\*^500 OR
    concept_class_id_ci:aspirin\*\ ibupro\*^100 OR
    domain_id_ci:aspirin\*\ ibupro\*^100 OR
    vocabulary_id_ci:aspirin\*\ ibupro\*^100
)
OR
(
    ( --asterisk
        concept_code:aspirin*^80000 OR
        concept_name:aspirin*^60000 OR
        concept_synonym_name:aspirin*^40000 OR
        concept_code_ci:aspirin*^30000 OR
        concept_name_ci:aspirin*^25000 OR
        concept_synonym_name_ci:aspirin*^20000 OR
        concept_code_text:aspirin*^10000 OR
        concept_name_text:aspirin*^8000 OR
        concept_synonym_name_text:aspirin*^5000
    )
    AND
    ( --asterisk
        concept_code:ibupro*^80000 OR
        concept_name:ibupro*^60000 OR
        concept_synonym_name:ibupro*^40000 OR
        concept_code_ci:ibupro*^30000 OR
        concept_name_ci:ibupro*^25000 OR
        concept_synonym_name_ci:ibupro*^20000 OR
        concept_code_text:ibupro*^10000 OR
        concept_name_text:ibupro*^8000 OR
        concept_synonym_name_text:ibupro*^5000
    )
)


```

