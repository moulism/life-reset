// Life Reset – připojení k Supabase.
// Publishable (anon) klíč je veřejný klíč – data chrání RLS (každý vidí jen své řádky).
window.LR_CONFIG = {
  supabaseUrl: 'https://gemjcncoeuzhytivixix.supabase.co',
  supabaseKey: 'sb_publishable_nVCusJhUIE4shJ66HqbiNg_4-lU-rKt',
  table: 'lr_items',
  bucket: 'lr-files',
  // veřejný klíč pro upozornění (Web Push)
  vapidPublic: 'BOHdJROu-9TeBRYGn1XrpI2vjq5plNUlfHU96H5XGjB-YvKFpelxYMf4-5w6ZOjxX660Zmwlv0g4f8tkdn8d_dw'
};
