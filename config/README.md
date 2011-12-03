Github Config
=========

In order to use the github features associated with Dilinger you need to create a file in this directory called `github.json`.

It shoud look like the following:

    {
      "client_id": "ccss0d6aaa33333eaafc"
    , "redirect_uri": "http://dillinger.io/"
    , "client_secret": "8e8076be325035274ca238e4dbe70d0317217e39"
    , "callback_url": "http://dillinger.io/oauth/github"
    , "admins": ["joemccann", "bobsaget"]
    }    

To obtain the `client_id` and the `client_secret` you'll need to register your application with Github.  Do that here:  [Github App]

You should add the Github usernames to the `admins` array in the config. That way only approved github users can save remotely.


  [Github App]: https://github.com/account/applications/new


Blog Server Config
=========

Here is where you will add things that are specific to your server for your blog.  Currently, you need to set the port:

  {
    "blog_port": 1337
  }