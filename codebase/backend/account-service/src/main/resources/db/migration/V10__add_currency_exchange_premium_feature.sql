-- Add currency_exchange premium feature
insert into premium_features (key, name, description)
values ('currency_exchange', 'Currency Exchange', 'Automatically fetch live exchange rates from Vietcombank and convert foreign expenses to VND.')
on conflict (key) do nothing;
