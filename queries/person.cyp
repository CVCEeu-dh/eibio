// name: merge_person
// simple merge person.
MERGE (per:entity:person {original_slug: {original_slug}})
  ON CREATE SET
    per.name = {name},
    per.first_name  = {first_name},
    per.last_name   = {last_name},
    per.birth_date  = {birth_date},
    per.birth_time  = {birth_time},
    {if:birth_place}
      per.birth_place = {birth_place},
    {/if}
    per.creation_date = {creation_date},
    per.creation_time = {creation_time},
    {if:doi}
      per.doi = {doi}
    {/if}
    {if:dois}
      per.dois = {dois}
    {/if}  
    {if:death_date}
      per.death_date  = {death_date},
      per.death_time  = {death_time},
    {/if}
    {if:death_place}
      per.death_place = {death_place},
    {/if}
    {if:viaf_id}
      per.viaf_id  = {viaf_id},
    {/if}
    {if:wiki_id}
      per.wiki_id  = {wiki_id},
    {/if}
    {if:languages}
      per.languages   = {languages},
      
      {each:language in languages}
        per.{:abstract_%(language)} = {{:abstract_%(language)}},
      {/each}
    {/if}
    per.slug = {slug}
  ON MATCH SET
    per.name = {name},
    per.first_name  = {first_name},
    per.last_name   = {last_name},
    per.birth_date  = {birth_date},
    per.birth_time  = {birth_time},
    {if:birth_place}
      per.birth_place = {birth_place},
    {/if}
    per.creation_date = {creation_date},
    per.creation_time = {creation_time},
    {if:doi}
      per.doi = {doi}
    {/if}
    {if:dois}
      per.dois = {dois}
    {/if}  
    {if:death_date}
      per.death_date  = {death_date},
      per.death_time  = {death_time},
    {/if}
    {if:death_place}
      per.death_place = {death_place},
    {/if}
    {if:viaf_id}
      per.viaf_id  = {viaf_id},
    {/if}
    {if:wiki_id}
      per.wiki_id  = {wiki_id},
    {/if}
    {if:languages}
      per.languages   = {languages},
      
      {each:language in languages}
        per.{:abstract_%(language)} = {{:abstract_%(language)}},
      {/each}
    {/if}
    per.slug = {slug}
  RETURN per

// name: merge_incomplete_person
// create a placeholder for a person when we do not have first_name or last_name information
MERGE (per:entity:person {original_slug: {original_slug}})
  ON CREATE SET
    per.name        = {name},
    per.languages   = {languages},
    per.doi         = {doi},
    per.dois        = {dois}
  RETURN per
    
// name: remove_person
// delete a person and its links, completely
MATCH (per:person {slug: {slug}})
OPTIONAL MATCH (per)-[r]-()
DELETE per, r