# eibio

eibio is a nodejs script that enrich a list of persons biographies. Cfr contents eibio.xml.example.
settings.paths.xml.people

# External sources
Eurovoc basename (name disambiguation in english)
e.g european parliament -> http://eurovoc.europa.eu/2243

# DBPEDIA api
EIBIO makes use of [dbpedia API](http://wiki.dbpedia.org/), via the discover method of each `models/<model>.js`.
First of all and if no wiki_id has been provided, we look for the [autosuggest](http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?MaxHits=5&QueryString=European%20Parliament)
which responds with a list of porobable matches in dbpedia
  ```xml
  <ArrayOfResult xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://lookup.dbpedia.org/">
  <Result>
  <Label>European Parliament</Label>
  <URI>http://dbpedia.org/resource/European_Parliament</URI>
  <Description>
  The European Parliament (abbreviated as Europarl or the EP) is the directly elected parliamentary institution of the European Union (EU). Together with the Council of the European Union (the Council) and the European Commission, it exercises the legislative function of the EU and it has been described as one of the most powerful legislatures in the world.
  </Description>
Once the URI has been loaded, it can be enriched with the corresponding dbpedia resource, e.g
[http://dbpedia.org/page/European_Parliament](http://dbpedia.org/page/European_Parliament)
  


  
  