const tempUsers = new Map();

/*
 token => {
   email,
   password,
   expireAt
 }
*/

exports.saveTempUser = (token, data) => {
  tempUsers.set(token, data);
};

exports.getTempUser = (token) => {
  return tempUsers.get(token);
};

exports.deleteTempUser = (token) => {
  tempUsers.delete(token);
};
