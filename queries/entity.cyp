// name: merge_entity
//
MERGE (ent:entity {slug: {slug}})
  ON CREATE SET
    ent.name = {name},
    ent.languages = {languages},
    ent.{:name_%(language)} = {{:name_%(language)}},
    ent.{:identity_%(language)} = {{:identity_%(language)}},
    ent.{:description_%(language)} = {{:description_%(language)}},
    ent.{:abstract_%(language)} = {{:abstract_%(language)}}
  ON MATCH SET
    ent.languages = {languages},
    ent.{:name_%(language)} = {{:name_%(language)}},
    ent.{:identity_%(language)} = {{:identity_%(language)}},
    ent.{:description_%(language)} = {{:description_%(language)}},
    ent.{:abstract_%(language)} = {{:abstract_%(language)}}
  RETURN ent

// name: merge_oral_history_entity
//
MERGE (ent:entity {slug: {slug}})
  ON CREATE SET
    ent.name = {name},
    ent.doi  = {doi},
    ent.languages = {languages},
    ent.{:name_%(language)} = {{:name_%(language)}},
    ent.{:identity_%(language)} = {{:identity_%(language)}},
    ent.{:description_%(language)} = {{:description_%(language)}},
    ent.{:abstract_%(language)} = {{:abstract_%(language)}},
    ent.{:nationality_%(language)} = {{:nationality_%(language)}}
  ON MATCH SET
    ent.name = {name},
    ent.doi  = {doi},
    ent.languages = {languages},
    ent.{:name_%(language)} = {{:name_%(language)}},
    ent.{:identity_%(language)} = {{:identity_%(language)}},
    ent.{:description_%(language)} = {{:description_%(language)}},
    ent.{:abstract_%(language)} = {{:abstract_%(language)}},
    ent.{:nationality_%(language)} = {{:nationality_%(language)}}
  RETURN ent
  

// name: merge_wiki_entity
//
MERGE (ent:entity {slug: {slug}})
  ON CREATE SET
    ent.name = {name},
    ent.doi  = {doi},
    
    ent.birth_date = {birth_date},
    ent.death_date = {death_date},
    ent.birth_place = {birth_place},
    ent.death_place = {death_place},
    
    ent.wiki_id = {wiki_id},
    ent.wiki_description = {wiki_description},
    
    ent.viaf_id = {viaf_id}
    
  ON MATCH SET
    ent.name = {name},
    ent.doi  = {doi},
    ent.birth_date = {birth_date},
    ent.death_date = {death_date},
    ent.birth_place = {birth_place},
    ent.death_place = {death_place},
    
    ent.wiki_id = {wiki_id},
    ent.wiki_description = {wiki_description},
    
    ent.viaf_id = {viaf_id}
  RETURN ent