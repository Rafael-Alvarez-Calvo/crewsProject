CREATE DATABASE IF NOT EXISTS crewProj;
USE crewProj;

SELECT * FROM users;
SELECT * FROM usersFacebook;
SELECT * FROM usersGoogle;
DROP DATABASE crewProj;

DROP TABLE usersFacebook;
DROP TABLE usersGoogle;
DROP TABLE users;
DELETE FROM usersGoogle WHERE email = 'ezokrafita2@gmail.com'; 

CREATE TABLE IF NOT EXISTS users (
	`usrid` INT NOT NULL AUTO_INCREMENT,
    `email` varchar(100) NOT NULL,
    `name` varchar(100) NOT NULL,
    -- `DoB` varchar(100) NOT NULL,
    -- `address` varchar(100) NOT NULL,
    -- `allergens` varchar(100) NOT NULL,
    -- ....
    `user_profile` varchar(5) NOT NULL DEFAULT 'user',
    PRIMARY KEY(usrid)
);

CREATE TABLE IF NOT EXISTS PersonalUsers (
	`id` INT NOT NULL AUTO_INCREMENT,
    `ext_usrid` INT NOT NULL,
    `psw` varchar(100) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY (ext_usrid)
        REFERENCES users (usrid)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS UsersFacebook (
	`id` smallint NOT NULL AUTO_INCREMENT,
    `ext_usrid` INT NOT NULL,
    `idFacebook` varchar(100) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY(ext_usrid)
        REFERENCES users(usrid)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS UsersGoogle(
	`id` smallint NOT NULL AUTO_INCREMENT,
    `ext_usrid` INT NOT NULL,
    `idGoogle` varchar(100) NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY(ext_usrid)
        REFERENCES users(usrid)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PersonalShoppingList (
	`listId` smallint NOT NULL AUTO_INCREMENT,
    `listName` varchar(100) NOT NULL,
    `APISMarketId` varchar(100) NOT NULL,
    `APISMarketName` varchar(100) NOT NULL,
    PRIMARY KEY(listId)
);

-- CREATE TABLE IF NOT EXISTS SuperMarkets  (
-- 	`SMarketId` smallint NOT NULL AUTO_INCREMENT,
-- 	`APISMarketId` varchar(100) NOT NULL,
--     `SMarketName` varchar(100) NOT NULL,
--     PRIMARY KEY(listId)
-- );

CREATE TABLE IF NOT EXISTS PShopSmarketsUsers  (
	`ext_usrId` smallint NOT NULL,
	`ref_listId` smallint NOT NULL,
	`ref_SMarketId` smallint NOT NULL,
    PRIMARY KEY(ext_usrId, ref_listId, ref_SMarketId),
    FOREIGN KEY (ext_usrId),
        REFERENCES users(usrid),
    FOREIGN KEY (ref_listId, ref_SMarketId),
        REFERENCES PersonalShoppingList(listId, APISMarketId)
        -- ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS PShopSmarketsUsersFacebook  (
	`ext_usrIdF` smallint NOT NULL,
	`ref_listId` smallint NOT NULL,
	`ref_SMarketId` smallint NOT NULL,
    PRIMARY KEY(ext_usrIdF, ref_listId, ref_SMarketId),
    FOREIGN KEY (ext_usrIdF),
        REFERENCES users(usrIdF),
    FOREIGN KEY (ref_listId, ref_SMarketId)
        REFERENCES PersonalShoppingList(listId, APISMarketId)
        -- ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS PShopSmarketsUsers  (
	`ext_usrIdG` smallint NOT NULL,
	`ref_listId` smallint NOT NULL,
	`ref_SMarketId` smallint NOT NULL,
    PRIMARY KEY(ext_usrIdG, ref_listId, ref_SMarketId),
    FOREIGN KEY (ext_usrIdG)
        REFERENCES usersGoogle(usrIdG),
    FOREIGN KEY (ref_listId, ref_SMarketId)
        REFERENCES PersonalShoppingList(listId, APISMarketId)
        -- ON DELETE CASCADE
);




INSERT INTO users VALUES(1,'admin', 'admin','admin');