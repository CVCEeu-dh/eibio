// name: merge_person
// simple merge person.
MERGE (per:entity:person {slug: {slug}})
  ON CREATE SET
    per.name = {name},
    per.first_name  = {first_name},
    per.last_name   = {last_name},
    per.birth_date  = {birth_date},
    per.birth_time  = {birth_time},
    per.birth_place = {birth_place},
    per.creation_date = {creation_date},
    per.creation_time = {creation_time},
    {if:death_date}
      per.death_date  = {death_date},
      per.death_time  = {death_time},
      per.death_place = {death_place},
    {/if}
    per.languages   = {languages},
    {each:language in languages}
      per.{:abstract_%(language)} = {{:abstract_%(language)}}
    {/each}
  ON MATCH SET
    per.name = {name},
    per.first_name  = {first_name},
    per.last_name   = {last_name},
    per.birth_date  = {birth_date},
    per.birth_time  = {birth_time},
    per.birth_place = {birth_place},
    per.last_modification_date = {creation_date},
    per.last_modification_date = {creation_time},
    {if:death_date}
      per.death_date  = {death_date},
      per.death_time  = {death_time},
      per.death_place = {death_place},
    {/if}
    per.languages   = {languages},
    {each:language in languages}
      per.{:abstract_%(language)} = {{:abstract_%(language)}}
    {/each}
  RETURN per
  
// name: remove_person
// delete a person and its links, completely
MATCH (per:person {slug: {slug}})
OPTIONAL MATCH (per)-[r]-()
DELETE per, r