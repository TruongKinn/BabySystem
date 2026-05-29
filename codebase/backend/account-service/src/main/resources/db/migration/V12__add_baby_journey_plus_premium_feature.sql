-- Signature premium feature for Memory DNA, AI Journey curation, Storybook, and Time Capsule.
insert into premium_features (key, name, description)
values ('baby_journey_plus', 'Baby Journey+', 'Memory DNA, AI-curated baby milestones, future Time Capsules, and monthly family Storybooks.')
on conflict (key) do nothing;
