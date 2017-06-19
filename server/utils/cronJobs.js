var {CronJob} = require('cron');


// cron job run every minute
var startUpdateFeeds = () => {
  new CronJob('0 */1 * * * *', function() {
  console.log('You will see this message every minute');
  }, null, true, 'Europe/Stockholm')
};

module.exports = {
  startUpdateFeeds
}
