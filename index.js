const database = require('./mongodb-connect');
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const app = express();
const port = 8022;

const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: true });
app.use(cors());

function getResponseObject(result, data) {
    var obj =
    {
        result: result,
        data: data
    }

    return obj;
}

app.post('/member-create', urlencodedParser, jsonParser, (req, res) => {
    var document =
    {
        card_no: req.body.card_no,
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,
        books: []
    }
    if (document['fname'] == '' || document['lname'] == '' || document['email'] == '') {
        var obj = getResponseObject("Please enter all the fields.", null);
        res.send(obj);
    }
    else {
        database.db.collection('Member').find({ card_no: document['card_no'] }).toArray((err, result) => {
            if (err) {
                var obj = getResponseObject("Failure!", null)
                res.send(obj);
            }
            else {
                if (result.length == 1) {
                    var obj = getResponseObject("Member already exists!", null);
                    res.send(obj);
                }
                else if (result.length == 0) {
                    database.db.collection('Member').insertOne(document, (err, result) => {
                        if (err) {
                            var obj = getResponseObject('Failed to add new member. Please try again later.', null)
                        }
                        else {
                            var obj = getResponseObject('New member added successfully!', null)
                        }
                        res.send(obj);
                    })
                }
            }
        })
    }
})

app.get('/view-members', urlencodedParser, jsonParser, (req, res) => {
    database.db.collection('Member').find().toArray((err, result) => {
        if (err) {
            var obj = getResponseObject("Error!", null)
            res.send(obj)
        }
        else if (result.length == 0) {
            var obj = getResponseObject("No members present!", null);
            res.send(obj);
        }
        res.send(result);
    })
})

app.post('/add-books', urlencodedParser, jsonParser, (req, res) => {
    var document =
    {
        book_name: req.body.book_name,
        author: req.body.author,
    }
    if (document['book_name'] == '' || document['author'] == '') {
        var obj = getResponseObject('Please enter all the fields.', null);
        res.send(obj)
    }
    else {
        database.db.collection('Book').insertOne(document, (err, result) => {
            if (err) {
                var obj = getResponseObject('Failed to add book. Please try again later.', null)
            }
            else {
                var obj = getResponseObject('New book added successfully!', result)
            }
            res.send(obj);
        })
    }
})

app.get('/view-books', urlencodedParser, jsonParser, (req, res) => {
    database.db.collection('Book').find().toArray((err, result) => {
        if (err) {
            var obj = getResponseObject("Error", null);
            res.send(obj)
        }
        else if (result.length == 0) {
            var obj = getResponseObject("No books present. Please add books.", null)
            res.send(obj)
        }
        res.send(result)
    })
})

app.post('/issue-books', urlencodedParser, jsonParser, (req, res) => {
    const card_no = req.body.card_no;
    const book_name = req.body.book_name;
    const issue_date = req.body.issue_date;
    //console.log(req.body.issue_date)
    const return_date = req.body.return_date;
    //console.log(issue_date);
    if (card_no == '' || book_name == '' || issue_date == '' || return_date == '') {
        var obj = getResponseObject('Please enter all the fields.')
        res.send(obj)
    }
    else {
        database.db.collection('Member').find({ card_no: req.body.card_no }).toArray((err, result) => {
            if (result.length == 0) {
                var obj = getResponseObject("Member does not exist. Please create a member first.", null);
                res.send(obj);
            }
            else if (result.length == 1) {
                database.db.collection('Member').findOneAndUpdate({ card_no: req.body.card_no }, { $push: { books: { book_name, issue_date, return_date } } }, { upsert: true, returnOriginal: false }, (err, result) => {
                    if (err) {
                        var obj = getResponseObject('Failed to issue book.  Please try again later.', err)
                    }
                    else {
                        var obj = getResponseObject('Book issued successfully!', result.value)
                    }
                    res.send(obj);
                })
            }
        })
    }
})

app.post('/return-book', urlencodedParser, jsonParser, (req, res) => {
    const card_no = req.body.card_no;
    const book_name = req.body.book_name;
    if (card_no == '' || book_name == '') {
        var obj = getResponseObject('Please enter all the fields.', null)
        res.send(obj)
    }
    database.db.collection('Member').find({ "card_no": req.body.card_no, "books.book_name": req.body.book_name }).toArray((err, result) => {
        if (result.length == 0) {
            var obj = getResponseObject("Member did not issue this book!", null);
            res.send(obj);
        }
        else if (result.length == 1) {
            database.db.collection('Member').findOneAndUpdate({ "card_no": card_no }, { $pull: { "books": { book_name } } }, { upsert: true, returnOriginal: false }, (err, result) => {
                if (err) {
                    var obj = getResponseObject('Failed to accept return. Please try again later', err)
                }
                else {
                    var obj = getResponseObject('Book returned!', result)
                }
                res.send(obj);
            })
        }
    })
})


app.listen(port, () => console.log(`Server listening on port ${port}!`))
