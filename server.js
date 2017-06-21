#!/usr/bin/env node

var express = require("express"),
app = express(),
hostname = process.env.HOSTNAME || 'localhost',
port = parseInt(process.env.PORT, 10) || 8000,
http = require('http');

const hotel_names = ['expedia','hilton', 'orbitz', 'priceline', 'travelocity'];

const getContent = function(url) {
	// return new pending promise
	return new Promise((resolve, reject) => {
		// select http or https module, depending on reqested url
		const lib = url.startsWith('https') ? require('https') : require('http');

		const request = lib.get(url, (response) => {
			
			if (response.statusCode < 200 || response.statusCode > 299) {
				reject(new Error('Failed to load page, status code: ' + response.statusCode)); // handle http errors
			}

			var json_chunk = {};
			
			response.on('data', (chunk) => {
				json_chunk = JSON.parse(chunk);
			});
			
			response.on('end', () => {
				resolve(json_chunk.results); // we are done, resolve promise with only with results array
			});
		});
		request.on('error', (err) => reject(err)); // handle connection errors of the request
	})
};


app.get('/hotels/search',function(req, res) {

	Promise.all(hotel_names.map((hotel) => getContent('http://localhost:9000/scrapers/' + hotel) )).then(function(results) {
		
		var ecstasy_arr = [];

		const hotel_obj_each = results.reduce(function (combinedProviders, provider) { 

			provider.forEach(function(element) {

			    ecstasy_arr.push(parseInt(element.ecstasy));
			    combinedProviders[element.ecstasy] = element;

			});	

			return combinedProviders;

		}, {});

		ecstasy_arr = ecstasy_arr.sort(function(a, b) { return a - b; }); // have a sorted list of ecstasy

		const output = ecstasy_arr.reduce(function (acc, ecstasy, i) { 

			acc[i] = hotel_obj_each[ecstasy]; // build a new array based on key/value pair
			return acc;

		}, []);

		res.json({ combined_results: output });
		// console.log(output);
	})
	.catch(function(error) {
		console.log(error); // One or more promises was rejected
	});	
});

console.log("listening at http://%s:%s", hostname, port);
app.listen(port, hostname);