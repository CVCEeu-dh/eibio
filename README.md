# eibio
Biographies made easy, with **neo4j** and **node express**.

	(person)-[:employed_as]->(activity)
	(institution)-[:appears_in]->(activity)
	(role)-[:appears_in]->(activity)


##installation on UNIX
download and extract **neo4j database server** in a proper folder. Follow the neo4j [installation documentation](http://neo4j.com/docs/stable/server-installation.html#linux-install), then configure the the `~/neo4j/conf/neo4j-server.properties` file: fill the `neo4j org.neo4j.server.database.location` with your database folder path, adjust the server port `org.neo4j.server.webserver.port`.
In order to change the password of the neo4j default user via the neo4j browser, modify the `org.neo4j.server.webserver.address` if you do not have access to localhost. Setup a new password for the default user neo4j and you're done.

Run neo4j with
  
  	~/neo4j/bin/neo4j start

Once neo4j is functional, __clone the eibio package__, then install the required __npm dependencies__.

  	git clone https://github.com/CVCEeu-dh/eibio.git
  	cd eibio
  	npm install

Copy `settings.js.example` to `settings.js`, then modify neo4j section according to your configuration.

Execute the setup script that flushes all the constraints to the neo4j db

    npm run-script setup

Then test it
  
  	npm test

then if everything is fine, you can start the eibio app:

  	npm start

to run eibio from another port than 8000, change the value of the `port` variable in `settings.js`

Eibio API service should now be available in localhost [http://localhost:8000/api](http://localhost:8000/api)


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
  ```
Once the URI has been loaded, it can be enriched with the corresponding dbpedia resource, e.g
[http://dbpedia.org/page/European_Parliament](http://dbpedia.org/page/European_Parliament)
  


  
# Some interesting queries
1. Get the number of job activities per role:
		```
    	MATCH (n:`role`)--(t:activity)
		    WITH n, count(*) as total
		  RETURN n.name, total ORDER BY total DESC
		```
  
1. Get the number of job activities per institution:
		```
    	MATCH (n:`institution`)--(t:activity)
		    WITH n, count(*) as total
		  RETURN n.name, total ORDER BY total DESC
  	```

1. Get the network of activities and person (direct "colleagueness")
    ```
      MATCH (t:activity)-[r2]-(p:person) RETURN t,r2,p LIMIT 10000;
    ```

1. Get closest institutions
    ```
    MATCH (ins:institution {slug: 'european-commission-bel'})-[r1:appears_in]->(act:activity)-[r3]-(per:person)-[r4]-(act2:activity)<-[r2:appears_in]-(ins2:institution)
RETURN ins, r2, act, per, act2, r3, r4, ins2
    ```
1. Find some direct collegue of a specific person
		```
    	MATCH (per:person {slug:"wim-duisenberg"})
    	OPTIONAL MATCH (per)-[r1:employed_as]->(act:activity)-[r2:employed_as]-(per2:person)
    	WHERE id(per) <> id(per2)
	    WITH r1, act, per, {
	     slug: per2.slug,
	     colleagueness: count(DISTINCT act),
	     dt: min(abs(r1.start_time - r2.start_time))
	    } as colleague
	    RETURN colleague
	    ORDER BY colleague.colleagueness DESC
		```
    
    
