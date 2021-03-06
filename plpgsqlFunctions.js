
let insertMessageFunction = 
`CREATE OR REPLACE FUNCTION insertMessage(user_id_ integer,group_id_ integer, message_ text, OUT message_id_ integer, OUT name_user_id_ integer, OUT req_ integer)
AS $result$ 
DECLARE
  group_found integer;
  length integer;
BEGIN
  SELECT members.name_user_id, members.req INTO name_user_id_,req_ 
    FROM members WHERE user_id = user_id_ AND group_id = group_id_ LIMIT 1;
  IF name_user_id_ IS NOT NULL THEN
    INSERT INTO messages(group_id,user_id,message,sent_at) VALUES(group_id_,user_id_,message_,NOW()) RETURNING message_id INTO message_id_;
    UPDATE members SET lastMessage = message_id_ WHERE group_id = group_id_;
    UPDATE members SET lastSeen=lastMessage WHERE user_id=user_id_ AND group_id=group_id_;
    UPDATE mgroups SET last_time = NOW() WHERE group_id = group_id_;
  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
END;
$result$ LANGUAGE plpgsql;
`


let createGroupAndInsert = `
CREATE OR REPLACE FUNCTION createGroupInsertMessage(user_id_ integer,group_id_ integer,message_ text,
  OUT message_id_ integer, OUT name_user_id_ integer,OUT new_group_id_ integer,OUT image_ text)
AS $result$
DECLARE 
  auth integer;
BEGIN
  SELECT count(*) INTO auth FROM friends WHERE user_id = group_id_ AND friend_id = user_id_;
  IF auth != 0 THEN
    RAISE EXCEPTION 'REQUEST SENT FROM USER';
  ELSE
    INSERT INTO friends(user_id,friend_id,time) VALUES(user_id_,group_id_,NOW());
    INSERT INTO mgroups(created_at,last_time) VALUES(NOW(),NOW()) RETURNING group_id INTO new_group_id_;
    INSERT INTO members(user_id,group_id,name_user_id,req) VALUES(user_id_,new_group_id_,group_id_,1);
    INSERT INTO requests(to_user_id,from_user_id,group_id,sent_at) VALUES(group_id_,user_id_,new_group_id_,NOW());
    INSERT INTO messages(group_id,user_id,message,sent_at) VALUES(new_group_id_,user_id_,message_,NOW()) RETURNING message_id INTO message_id_;
    SELECT image INTO image_ FROM images WHERE user_id=user_id_;
    UPDATE members SET lastMessage = message_id_ WHERE group_id = new_group_id_;
    UPDATE members SET lastSeen=lastMessage WHERE user_id=user_id_ AND group_id=new_group_id_;
    UPDATE mgroups SET last_time = NOW() WHERE group_id = new_group_id_;
  END IF;
END;
$result$ LANGUAGE plpgsql;
`
let addMembers = `
  
CREATE OR REPLACE FUNCTION addMemberToGroup(user_id_ integer,group_id_ integer,new_members_ integer[],
new_members_number_ integer, new_members_values_ mytype[],
OUT name_user_id_ integer,
OUT last_message_user_id_ integer,
OUT last_message_id_ integer,
OUT last_message_ text,
OUT sent_at_ TIMESTAMP,
OUT image_ text,
OUT group_user_name_ VARCHAR,
OUT old_members_ integer[],
OUT all_members_id_ integer[],
OUT all_members_username_ varchar[],
OUT all_members_image_ text[]

)
AS $$
DECLARE
auth integer;
BEGIN
SELECT name_user_id INTO name_user_id_ FROM members WHERE user_id = user_id_ AND group_id = group_id_ LIMIT 1;
IF name_user_id_ IS NULL THEN
  RAISE EXCEPTION 'asdasd';
ELSE
  SELECT count(*) INTO auth FROM members WHERE user_id = user_id_ AND req != 2 AND name_user_id = 
  ANY (new_members_);
  IF auth != new_members_number_ THEN
    RAISE EXCEPTION 'asdasdas';
  ELSE
    SELECT count(*) INTO auth FROM members WHERE group_id = group_id_ AND user_id = ANY (new_members_);
    IF auth != 0 THEN
      RAISE EXCEPTION 'some selecred members are already added';
    ELSE
      SELECT message_id,user_id,sent_at,message
      INTO last_message_id_,last_message_user_id_,sent_at_,last_message_
      FROM messages WHERE group_id = group_id_ ORDER BY sent_at DESC LIMIT 1;
      SELECT users.username,images.image INTO group_user_name_,image_ 
      FROM users JOIN images ON images.user_id = users.user_id 
      WHERE users.user_id = name_user_id_;
      old_members_:= Array(SELECT user_id FROM members WHERE group_id = group_id_ AND user_id != user_id_);
      INSERT INTO members(user_id,group_id,name_user_id,req) SELECT val1,val2,name_user_id_,val4 FROM unnest(new_members_values_) ;   
      SELECT array_agg(members.user_id), array_agg(users.username),array_agg(images.image) INTO all_members_id_, all_members_username_,
      all_members_image_
       FROM members
      JOIN users ON users.user_id = members.user_id
      JOIN images ON images.user_id = members.user_id
      WHERE group_id = group_id_;
      
    END IF;
  END IF;
END IF;
END;
$$LANGUAGE plpgsql;
`

let getMessage = `
CREATE OR REPLACE FUNCTION getMessages(user_id_ integer, group_id_ integer)
RETURNS TABLE(
  message TEXT,
  message_id integer,
  sent_at TIMESTAMP WITH TIME ZONE,
  username VARCHAR,
  user_id integer,
  group_id integer
) AS $$
DECLARE
  auth integer;
BEGIN
  SELECT count(*) INTO auth FROM members WHERE members.user_id = user_id_ AND members.group_id = group_id_;
  IF auth = 0 THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  ELSE
    RETURN QUERY
    SELECT messages.message,messages.message_id,messages.sent_at,
    users.username,users.user_id,messages.group_id 
    FROM messages JOIN 
    users ON messages.user_id = users.user_id 
    AND messages.group_id = group_id_
    ORDER BY sent_at ASC;
  END IF;
END;
$$LANGUAGE plpgsql;
`
let createNewGroup = `
  CREATE OR REPLACE FUNCTION createGroup(user_id_ integer,group_name_ varchar, image_ text) 
  RETURNS TABLE(
    group_id integer,
    userlastSeen integer,
    lastMessageId integer,
    name_user_id integer,
    req integer,
    lastSeen integer,
    group_user_name varchar,
    group_name varchar,
    last_time TIMESTAMP WITH TIME ZONE,
    image text,
    message text,
    last_message_user_id integer
  )
  AS $$
  DECLARE
    name_user_id_ integer;
    created_group_id_ integer;
  BEGIN
    INSERT INTO users(username,created_at,type) VALUES(group_name_,NOW(),1) RETURNING user_id INTO name_user_id_;
    INSERT INTO images(user_id,image) VALUES(name_user_id_,image_);
    INSERT INTO mgroups(created_at,last_time) VALUES(NOW(),NOW()) RETURNING mgroups.group_id INTO created_group_id_;
    INSERT INTO members(user_id,group_id,name_user_id,req) VALUES(user_id_,created_group_id_,name_user_id_,2);
    RETURN QUERY
        SELECT 
        members.group_id,members.lastSeen as userlastSeen,members.lastMessage as lastMessageId,
        members.name_user_id,members.req,
        members2.lastSeen,users.username as group_user_name,
        mgroups.name as group_name ,mgroups.last_time,
        images.image,messages.message,messages.user_id as last_message_user_id 
    FROM 
        members members
    LEFT JOIN
        members members2 ON members.name_user_id=members2.user_id AND members.group_id=members2.group_id
    JOIN 
        mgroups ON members.group_id = mgroups.group_id
    JOIN
        users ON members.name_user_id = users.user_id
    JOIN
        images ON images.user_id = members.user_id
    LEFT JOIN
        messages ON messages.message_id=members.lastMessage
    WHERE 
        members.user_id = user_id_ AND members.group_id = created_group_id_;
    END;
  $$LANGUAGE plpgsql;
`

let acceptRequest = `
  CREATE OR REPLACE FUNCTION acceptRequest(user_id_ integer,group_id_ integer,
  OUT from_user_id_ integer)
  AS $$
  DECLARE
    req_id_ integer;
  BEGIN
  SELECT request_id,from_user_id INTO req_id_,from_user_id_ FROM requests WHERE to_user_id = user_id_ AND group_id = group_id_ LIMIT 1;
  IF req_id_ IS NULL THEN 
    RAISE EXCEPTION 'request not found';
  ELSE
    INSERT INTO friends(user_id,friend_id,time) VALUES(user_id_,from_user_id_,NOW());
    INSERT INTO members(user_id,group_id,name_user_id) VALUES(user_id_,group_id_,from_user_id_);
    UPDATE members SET req = 0 WHERE user_id = from_user_id_ and name_user_id =user_id_;
    DELETE from requests WHERE request_id = req_id_;
  END IF;
END;
$$LANGUAGE plpgsql;
`
