// name: merge_role
MERGE (rol:role {slug: {slug}})
  ON CREATE SET
    rol.name           = {name},
    {if:name_fr}
      rol.name_fr      = {name_fr},
    {/if}
    {if:name_en}
      rol.name_en      = {name_en},
    {/if}
    {if:abstract_fr}
      rol.abstract_fr  = {abstract_fr},
    {/if}
    {if:abstract_en}
      rol.abstract_en  = {abstract_en},
    {/if}
    rol.creation_date  = {creation_date},
    rol.creation_time  = {creation_time}
  ON MATCH SET
    {if:name_fr}
      rol.name_fr      = {name_fr},
    {/if}
    {if:name_en}
      rol.name_en      = {name_en},
    {/if}
    rol.last_modification_date  = {creation_date},
    rol.last_modification_date  = {creation_time}
RETURN {
  uri: 'role/'+rol.slug,
  slug:  rol.slug,
  props: rol,
  type:  last(labels(rol))
}

// name: merge_role_activity_relationship
//
MATCH (rol:role {slug: {slug}}), (act:activity {slug:{activity_slug}})
MERGE (rol)-[r:appears_in]->(act)
RETURN  {
  uri: 'role/'+rol.slug,
  slug:  rol.slug,
  props: rol,
  type:  last(labels(rol))
}


// name: remove_role
// delete an institution and its links
MATCH (rol:role {slug: {slug}})
OPTIONAL MATCH (rol)-[r]-()
DELETE rol, r