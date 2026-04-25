const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.DB_URI);
  const User = require('./src/models/User');
  const Story = require('./src/models/Story');
  
  const user = await User.findOne();
  if(!user) { console.log("No user found"); process.exit(0); }
  
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  console.log("Got token for user", user.username);
  
  try {
    const feedRes = await fetch('http://localhost:3000/stories/feed', { headers: { Authorization: token } });
    const feedData = await feedRes.json();
    console.log("Feed length:", feedData.length);
    if(feedData.length > 0) {
       const ownerId = feedData[0].storyOwner;
       console.log("Fetching stories for", ownerId);
       const storiesRes = await fetch(`http://localhost:3000/stories/${ownerId}`, { headers: { Authorization: token } });
       const storiesData = await storiesRes.json();
       console.log("Stories length:", storiesData.length);
       if(storiesData.length > 0) {
         const storyId = storiesData[0]._id;
         console.log("Viewing story", storyId);
         const viewRes = await fetch(`http://localhost:3000/stories/${storyId}/view`, { method: 'POST', headers: { Authorization: token } });
         console.log("View status:", viewRes.status);
         console.log("View response:", await viewRes.text());
       }
    } else {
       console.log("No feed items");
       const allStories = await Story.find();
       if(allStories.length > 0) {
          const s = allStories[0];
          console.log("Trying direct view for story", s._id);
          const viewRes = await fetch(`http://localhost:3000/stories/${s._id}/view`, { method: 'POST', headers: { Authorization: token } });
          console.log("View status:", viewRes.status);
          console.log("View response:", await viewRes.text());
       }
    }
  } catch (err) {
    console.log("ERROR:", err.message);
  }
  process.exit(0);
}
test();
