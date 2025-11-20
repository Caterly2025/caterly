-- create_tables.sql
create table tOwner(id int, name text, mobilephone text,email text,fullAddress text, notes text,lastModifiedOn timestamp , lastModifiedBy_owner_id int);
create table tRestaurant(id int, name text, location text , mobilephone text,email text,fullAddress text, notes text, fk_owner_id int,lastModifiedOn timestamp , lastModifiedBy_owner_id int);
create table tCustomer(id int, name text, mobilephone text,email text,fullAddress text, notes text,lastModifiedOn timestamp);
create table tMenu(id int, fk_restaurant_id int, lastModifiedOn timestamp , lastModifiedBy_owner_id int);
create table tMenuItem(id int,itemName text, itemDescription text,minQuantity text, maxQuantity text, itemType int, fk_menu_id int,lastModifiedOn timestamp , lastModifiedBy_owner_id int);
create table tMenuItemType(id int, name text, measure text,lastModifiedOn timestamp , lastModifiedBy_owner_id int);
create table tOrder(id int, name text, lastModifiedOn timestamp , lastModifiedBy_customer_id int)
create table tOrderItem(id int,name text,lastModifiedOn timestamp , lastModifiedBy_customer_id int)
