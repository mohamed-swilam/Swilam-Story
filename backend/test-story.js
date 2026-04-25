const mongoose = require('mongoose');
require('dotenv').config({path: '.env'});

async function test() {
  await mongoose.connect(process.env.DB_URI);
  const Story = require('./src/models/Story');
  const story = await Story.findById('69ecb812dbc94e473a9e1b4c');
  console.log("Story:", story ? "EXISTS" : "DOES NOT EXIST");
  if(story) console.log(story);
  
  const stories = await Story.find({ storyOwner: '693fd2e029714dd3374782e7' });
  console.log("Stories for owner:", stories.map(s => s._id.toString()));
  
  process.exit(0);
}
test();
