/* eslint-disable no-loop-func */
import React from 'react';
const rp = require('request-promise');
var request = require('request').defaults({ encoding: null });
let pubList = [];
let imgData = {};

/**
 * Retrieves data from PubMed on publications available based on an organism and scrape the figures from those publications
 */
export default class RetrieveData extends React.Component {
    /**
     * Retrieves information about the publications
     * @param {String} organism The name of the organism 
     * @param {Number} retmax The maximum number of publications that you wish to scrape through, in order of most recent publications date
     */
    ncbiArticleInfo(organism = 'Arabidopsis-thaliana', retmax = 100) {
        // Create defaults if invalid inputs were inserted
        if (organism === '') {
            organism = 'Arabidopsis-thaliana'
        };
        if (retmax === '' || retmax === 0 || isNaN(retmax)) {
            retmax = 100;
        };
        console.log(organism, retmax);

        const xhr = new XMLHttpRequest();

        let db = 'pubmed';
        pubList = [];

        let base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
        let url = base + 'esearch.fcgi?db=' + db + '&term=' + organism + '[Organism]&usehistory=y&retmax=' + retmax;
        // console.log(url);

        xhr.responseType = 'document';
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                let response = xhr.responseXML;
                console.log(response);
                document.getElementById('progress').innerHTML = 'Starting scraping';
                document.getElementById('titleOfPage').innerHTML = 'Starting scraping';

                // Create a list of PMC publication IDs
                let tempList = [];
                if (response && response.getElementsByTagName('IdList')[0]) {
                    tempList = response.getElementsByTagName('IdList')[0]['innerHTML'].trim().split('\n');
                    for (var i = 0; i < tempList.length; i++) {
                        pubList.push(tempList[i].replace('<Id>', '').replace('</Id>', ''));
                    };
                };

                console.log(pubList);
                this.retrieveFigures(pubList, retmax);
            };
       };

       xhr.open('GET', url, true);
       xhr.send();
    };

    /**
     * Retrieve figures from the publication in the the list provided in pubmedIDList
     * @param {Array} pubmedIDList A list of PMC publication IDs that will be scraped through to retrieve figures from, a default one of '31307397' is provided for manual testing purposes
     */
    retrieveFigures(pubmedIDList = ['31307397']) {
        document.getElementById('progress').innerHTML = 'Starting to retrieve figures';
        document.getElementById('titleOfPage').innerHTML = 'Starting to retrieve figures';
        console.log('Starting to retrieve figures');
        
        for (var i = 0; i < pubmedIDList.length; i++) {
            let corsProxy = 'http://localhost:8080/';
            let url = corsProxy + 'https://ncbi.nlm.nih.gov/pubmed/' + pubmedIDList[i];
            // let url = 'https://ncbi.nlm.nih.gov/pubmed/' + pubmedIDList[i];
    
            if (i === pubmedIDList.length - 1) {
                imgParse(url, true);
            } else {
                imgParse(url);
            };
        };       
    };

    init(organism, retmax) {
        this.ncbiArticleInfo(organism, retmax);
    };
};

/**
 * Retrieve the image itself separated from the publication website on PubMed
 * @param {String} url URL of the PubMed website for the publication
 * @param {Boolean} final Whether this is the last publication to scrape through or not
 */
function imgParse(url, final = false) {
    rp(url).then(
        function(html) {
            let doc = new DOMParser().parseFromString(html, 'text/html');
            let tempImgList = [];

            let imgList = doc.getElementsByClassName('figpopup');
            for (var p = 0; p < imgList.length; p++) {
                var imgHead = imgList[p];
                if (imgHead.children.length > 0 && imgHead.children[0].getAttribute('src-large') !== null) {
                    tempImgList.push(imgHead.children[0].getAttribute('src-large'));
                };
            };

            if (tempImgList !== [] && tempImgList.length > 0) {
                var link;
                var splitLink = url.split('http://localhost:8080/');
                if (splitLink.length > 1) {
                    link = splitLink[1];
                } else {
                    link = splitLink[0];
                }
                imgData[link] = tempImgList;
                let imgURL = '';
                for (var d = 0; d < tempImgList.length; d++) {
                    imgURL = 'http://localhost:8080/https://ncbi.nlm.nih.gov' + tempImgList[d];
                    
                    document.getElementById('progress').innerHTML = 'Image position: ' + d + '/' + tempImgList.length;
                    document.getElementById('titleOfPage').innerHTML = 'Image position: ' + d + '/' + tempImgList.length;
    
                    var data;
                    request.get(imgURL, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            var urlUsed = response['url'];
                            var urlSplit = urlUsed.split('/');
                            var usedPubmedID = 'brokenID';
                            for (var u = 0; u < urlSplit.length; u++) {
                                if (urlSplit[u] !== undefined && urlSplit[u] !== '' && isNaN(urlSplit[u]) === false) {
                                    usedPubmedID = urlSplit[u];
                                    break;
                                };
                            };
                            var usedImgName = urlSplit[urlSplit.length - 1];
    
                            // console.log(urlUsed);
                            data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
    
                            // This will download the image
                            document.getElementById('imgTest').src = data;
                            document.getElementById('imgLinkTest').href = data;
                            var filename = usedPubmedID + '-' + usedImgName;
                            document.getElementById('imgLinkTest').download = filename;
                            document.getElementById('imgLinkTest').innerHTML = urlUsed;
                            document.getElementById('imgLinkTest').click();
                        }
                    });
    
                    // Stop process if this is true
                    if (final === true) {
                        // console.log(imgData);
                        document.getElementById('progress').innerHTML = 'Done';
                        document.getElementById('titleOfPage').innerHTML = 'Done';
                    };
                };
            };

            if (tempImgList.length === 0 && final === true) {
                console.log(imgData);
                document.getElementById('progress').innerHTML = 'Done';
                document.getElementById('titleOfPage').innerHTML = 'Done';
            };
        }
    ).catch(
        function(err) {
            console.log(err);
        }
    );
};