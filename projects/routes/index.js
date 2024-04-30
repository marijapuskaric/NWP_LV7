var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Project = require('../model/projects');
var ProjectUser = require('../model/projectUser');
var User = require('../model/users');
var db = require('../model/db');
const bcrypt = require("bcrypt");
const session = require('express-session');

//ruta za prikaz stranice za registraciju
router.get('/register', async (req,res) =>
{
  if (req.session.userId)
  {
    res.redirect('/');
  }
  else
  {
    res.render('register', { title: 'Register', isLoggedIn: req.session.isLoggedIn});
  }
});

//ruta za registriranje korisnika, sprema novog korisnika u bazu i prijavljuje ga u aplikaciju
router.post('/register', async (req, res) =>
{
  const user = await User.findOne({email: req.body.email})
  if (user)
  {
    return res.status(400).send('User already exists. Please sign in');
  }
  else
  {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    var hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User
    ({
      name: name,
      email: email,
      password: hashedPassword,
    }); 

    try 
    {
      await newUser.save();
      const user = await User.findOne({ email });
      req.session.isLoggedIn = true;
      req.session.userId = user._id;
      req.session.username = user.name;
      console.log("User registered successfully:", user);
      res.redirect('/');
    } 
    catch (err) 
    {
      console.error(err); 
      res.status(500).send("Error registering new user"); 
    }
  }
});

//ruta za prikaz stranice za prijavu
router.get('/login', async (req,res) =>
{
  if (req.session.userId)
  {
    res.redirect('/');
  }
  else
  {
    res.render('login', { title: 'Login', isLoggedIn: req.session.isLoggedIn});
  }
});

//ruta za prijavu korisnika
router.post('/login', async (req, res) =>
{
  const user = await User.findOne({email: req.body.email})
  if (user)
  {
    var password = req.body.password;
    if (await bcrypt.compare(password, user.password))
    {
      req.session.isLoggedIn = true;
      req.session.userId = user._id;
      req.session.username = user.name;
      console.log("User logged in successfully:", user);
      res.redirect('/');
    }
    else
    {
      return res.status(401).send('Email or password is incorrect.');
    }
  }
  else
  {
    return res.status(401).send('User not found. Please register.');
  }
});

//ruta za odjavu, uništava sesiju
router.get('/logout', async (req,res) =>
{
  req.session.destroy((err) => 
  {
    if(err)
    {
      console.error("Error destroying session: ", err);
      res.status(500).send("Error logging out"); 
    }
    else
    {
      res.redirect("/login");
    }
  });
});

//ruta za prikaz pocetne stranice sa svim nearhiviranim projektima gdje je trenutni korisnik menadzer
//ukljucuje dohvacanje svih clanova i postavljanje formata datuma za prikaz
router.get('/', async (req, res, next) => 
{
  var currentUser=req.session.userId;
  if (currentUser)
  {
    try 
    {
      const projects = await Project.find({manager: currentUser, isArchived: false});
      for (let project of projects) 
      {
        const members = await ProjectUser.find({ projectId: project._id }).populate('userId');
        project.members = members.map(member => member.userId);

        var startDate = project.startDate.toISOString();
        project.start_date = startDate.substring(0, startDate.indexOf('T'));
        var endDate = project.endDate.toISOString();
        project.end_date = endDate.substring(0, endDate.indexOf('T'));
      }
      res.render('index', { title: 'My Projects', projects: projects, isLoggedIn: req.session.isLoggedIn, username: req.session.username});
    } 
    catch (err) 
    {
      console.error('Error fetching projects:', err);
      res.status(500).send('Error fetching projects');
    }
  }
  else
  {
    res.redirect("/login");
  }
});

//ruta za prikaz stranice sa svim projektima na kojima je korisnik clan tima
//ukljucuje dohvacanje svih clanova i postavljanje formata datuma za prikaz
router.get('/team-projects', async (req, res, next) => 
{
  var currentUser=req.session.userId;
  if (currentUser)
  {
    try 
    {
      const userProjects = await ProjectUser.find({ userId: currentUser }).populate('projectId');
      const projects = userProjects.map(userProject => userProject.projectId).filter(project => !project.isArchived);;
      for (let project of projects) 
      {
        const members = await ProjectUser.find({ projectId: project._id }).populate('userId');
        project.members = members.map(member => member.userId);

        var startDate = project.startDate.toISOString();
        project.start_date = startDate.substring(0, startDate.indexOf('T'));
        var endDate = project.endDate.toISOString();
        project.end_date = endDate.substring(0, endDate.indexOf('T'));
      }
      res.render('teamProjects', { title: 'Team Projects', projects: projects, isLoggedIn: req.session.isLoggedIn, username: req.session.username});
    } 
    catch (err) 
    {
      console.error('Error fetching projects:', err);
      res.status(500).send('Error fetching projects');
    }
  }
  else
  {
    res.redirect("/login");
  }
});

//ruta za prikaz stranice sa formom za dodavanje novog projekta
router.get('/create-project', function(req, res) 
{
  if (req.session.userId)
  {
    res.render('createProject', { title: 'Add new project', isLoggedIn: req.session.isLoggedIn, username: req.session.username});
  }
  else
  {
    res.redirect("/login");
  }
});

//ruta za stvaranje novog projekta
//uzima podatke iz forme, stvara novi projekt te ga sprema u bazu podataka
router.post('/create-project', async (req, res) => 
{
  var name = req.body.name;
  var description = req.body.description;
  var price = req.body.price;
  var finishedTasks = req.body.finishedTasks;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  var manager = req.session.userId;

  const newProject = new Project
  ({
    name: name,
    description: description,
    price: price,
    finishedTasks: finishedTasks,
    startDate: startDate,
    endDate: endDate,
    manager: manager
  });
  try 
  {
    await newProject.save();
    res.redirect('/');
  } 
  catch (err) 
  {
    console.error(err); 
    res.status(500).send("Error inserting project data"); 
  }
});

//ruta za prikaz stranice sa formom za uredivanje postojeceg projekta
//predaje se id projekta te se u formi prikazuju trenutni podatci o tom projektu koji se mogu izmijeniti
//ukljucuje formatiranje datuma za prikaz
router.get('/edit-project/:id', async function(req, res) 
{
  var currentUser = req.session.userId;
  if (currentUser)
  {
    try 
    {
      var manager = false;
      const project = await Project.findById(req.params.id);

      var startDate = project.startDate.toISOString();
      startDate = startDate.substring(0, startDate.indexOf('T'));
      var endDate = project.endDate.toISOString();
      endDate = endDate.substring(0, endDate.indexOf('T'));

      if (project.manager == currentUser)
      {
        manager = true;
      }

      res.render('editProject', 
      {
        title: 'Edit project ',
        "startDate" : startDate,
        "endDate" : endDate,
        "project" : project,
        isLoggedIn: req.session.isLoggedIn,
        username: req.session.username,
        "manager": manager
      });
    }
    catch
    {
      console.error('Error fetching project:', err);
      res.status(500).send('Error fetching project');
    }
  }
  else
  {
    res.redirect("/login");
  }
});

//ruta za update podataka o projektu u bazi podataka
//uzima podatke iz forme te pronalazi taj projekt u bazi i postavlja njegove nove podatke
router.post('/edit-project/:id', async (req,res) => 
{
  var id = req.body._id;
  var name = req.body.name;
  var description = req.body.description;
  var price = req.body.price;
  var finishedTasks = req.body.finishedTasks;
  var startDate = req.body.startDate;
  var endDate = req.body.endDate;
  try 
  {
    const project = await Project.findById(id);
    await project.updateOne
    ({
      name : name,
      description : description,
      price : price,
      finishedTasks : finishedTasks,
      startDate : startDate,
      endDate : endDate
    });

    if (project.manager == req.session.userId)
    {
      res.redirect('/');
    }
    else
    {
      res.redirect('/team-projects');
    }
  }
  catch (err) 
  {
    console.error(err); 
    res.status(500).send("Error updating project data"); 
  }
});

//ruta za brisanje projekta iz baze podataka
//prima id projekta, pronalazi ga u bazi te brise
router.post('/delete-project/:id', async (req,res) => 
{
  try 
  {
    const project = await Project.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } 
  catch (err) 
  {
    console.error(err); 
    res.status(500).send("Error deleting project"); 
  }
});

//ruta za prikaz stranice sa formom za dodavanje novog clana tima
//prima id projekta te prikazuje sve registrirane korisnike osim trenutnog
router.get('/add-teammember/:id', async function(req, res) 
{
  var currentUser = req.session.userId;
  if(currentUser)
  {
    try 
    {
      const project = await Project.findById(req.params.id);
      const users = await User.find({ _id: { $ne: currentUser } });
      res.render('addTeamMember', 
      { 
        title: 'Add team member',
        "project" : project,
        "users" : users,
        isLoggedIn: req.session.isLoggedIn, 
        username: req.session.username
      });
    }
    catch (err)
    {
      console.error('Error fetching project:', err);
      res.status(500).send('Error fetching project team member');
    }
  }
  else
  {
    res.redirect("/login");
  }
});

//ruta za spremanje novog clana tima u bazu
//uzima podatke iz forme (id projekta i id korisnika) te sprema te podatke u bazu podataka (kolekcija projectusers)
router.post('/add-teammember/:id', async (req,res) => 
{
  var projectId = req.body.projectId;
  var userId = req.body.user;

  const newProjectUser = new ProjectUser
  ({
    projectId: projectId,
    userId: userId,
  });
  try 
  {
    await newProjectUser.save();
    res.redirect('/');
  } 
  catch (err) 
  {
    console.error(err); 
    res.status(500).send("Error adding a new team member"); 
  }
});

//ruta za brisanje clana tima s projekta
//prima id projectUser-a, pronalazi ga u bazi i brise
router.post('/delete-projectUser/:id', async (req,res) => 
{
  var user = req.params.id;
  var project = req.body.projectId;
  try 
  {
    await ProjectUser.findOneAndDelete({ userId: user, projectId: project });
    res.redirect('/');
  }
  catch (err) 
  {
    console.error(err); 
    res.status(500).send("Error deleting project user"); 
  }
});

//ruta za arhiviranje projekta 
router.post('/archive/:id', async (req,res) => 
{
  try 
  {
    const project = await Project.findById(req.params.id);
    await project.updateOne
    ({
      isArchived : true
    });
    res.redirect('/');
  } 
  catch (err) 
  {
    console.error(err); 
    res.status(500).send("Error archiving project"); 
  }
});

//ruta za micanje projekta iz arhive
router.post('/remove-from-archive/:id', async (req,res) => 
{
  try 
  {
    const project = await Project.findById(req.params.id);
    await project.updateOne
    ({
      isArchived : false
    });
    res.redirect('/archive');
  } 
  catch (err) 
  {
    console.error(err); 
    res.status(500).send("Error removing project from archive"); 
  }
});

//ruta za prikaz arhive
router.get('/archive', async (req, res, next) => 
{
  var currentUser=req.session.userId;
  if (currentUser)
  {
    try 
    {
      const myProjects = await Project.find({manager: currentUser, isArchived: true});
      for (let project of myProjects) 
      {
        const members = await ProjectUser.find({ projectId: project._id }).populate('userId');
        project.members = members.map(member => member.userId);

        var startDate = project.startDate.toISOString();
        project.start_date = startDate.substring(0, startDate.indexOf('T'));
        var endDate = project.endDate.toISOString();
        project.end_date = endDate.substring(0, endDate.indexOf('T'));
      }
      const userProjects = await ProjectUser.find({ userId: currentUser }).populate('projectId');
      const teamProjects = userProjects.map(userProject => userProject.projectId).filter(project => project.isArchived);;
      for (let project of teamProjects) 
      {
        const members = await ProjectUser.find({ projectId: project._id }).populate('userId');
        project.members = members.map(member => member.userId);

        var startDate = project.startDate.toISOString();
        project.start_date = startDate.substring(0, startDate.indexOf('T'));
        var endDate = project.endDate.toISOString();
        project.end_date = endDate.substring(0, endDate.indexOf('T'));
      }
      res.render('archive', { title: 'Archive', myProjects: myProjects, teamProjects: teamProjects, isLoggedIn: req.session.isLoggedIn, username: req.session.username});
    } 
    catch (err) 
    {
      console.error('Error fetching projects:', err);
      res.status(500).send('Error fetching projects');
    }
  }
  else
  {
    res.redirect("/login");
  }
});

module.exports = router;