// name: create_constraint_person_slug
// create slug constraint for person
CREATE CONSTRAINT ON (per:person) ASSERT per.slug IS UNIQUE

// name: create_constraint_institution_slug
// create slug constraint for person
CREATE CONSTRAINT ON (ins:institution) ASSERT ins.slug IS UNIQUE

// name: create_constraint_activity_slug
// create slug constraint for person
CREATE CONSTRAINT ON (act:activity) ASSERT act.slug IS UNIQUE

// name: create_constraint_role_slug
// create slug constraint for person
CREATE CONSTRAINT ON (rol:role) ASSERT rol.slug IS UNIQUE

// name: create_constraint_nationality_slug
// create slug constraint for person
CREATE CONSTRAINT ON (nat:nationality) ASSERT nat.slug IS UNIQUE