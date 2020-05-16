'use strict';

module.exports = function (nodecg) {
  nodecg.listenFor('twitch.chat.message', 'twitch-connect', ({
    channel,
    user,
    message,
    meta,
    self,
  }) => {
    nodecg.log.debug("CHAT IN ALERTS", message);
  });
  
  nodecg.listenFor('twitch.following', 'twitch-connect', (ev) => {
    nodecg.log.debug("FOLLOW", ev);
  });
};
