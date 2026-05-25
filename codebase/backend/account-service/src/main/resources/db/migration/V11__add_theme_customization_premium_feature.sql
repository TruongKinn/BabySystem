-- Premium feature for user/admin theme customization controls.
insert into premium_features (key, name, description)
values ('theme_customization', 'Theme Customization', 'Unlock accent palettes, compact density, and sharper interface radius in the settings theme studio.')
on conflict (key) do nothing;
