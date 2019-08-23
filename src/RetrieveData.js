/* eslint-disable no-loop-func */
import React from 'react';
const rp = require('request-promise');
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
            let corsProxy = 'https://cors-anywhere.herokuapp.com/';
            let url = corsProxy + 'https://ncbi.nlm.nih.gov/pubmed/' + pubmedIDList[i];
    
            if (i === pubmedIDList.length - 1) {
                imgParse(url, pubmedIDList[i], true);
            } else {
                imgParse(url, pubmedIDList[i]);
            };

            document.getElementById('progress').innerHTML = 'Article: ' + i + '/' + pubList.length;
            document.getElementById('titleOfPage').innerHTML = 'Article: ' + i + '/' + pubList.length;
        };       
    };

    init(organism, retmax) {
        this.ncbiArticleInfo(organism, retmax);
    };
};

/**
 * Retrieve the image itself separated from the publication website on PubMed
 * @param {String} url URL of the PubMed website for the publication
 * @param {String} pubmedID PMC publication Id for the publication
 * @param {Boolean} final Whether this is the last publication to scrape through or not
 */
function imgParse(url, pubmedID, final = false) {
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

            let link = url.split('https://cors-anywhere.herokuapp.com/')[1];
            imgData[link] = tempImgList;
            let imgURL = '';
            for (var d = 0; d < tempImgList.length; d++) {
                imgURL = 'https://ncbi.nlm.nih.gov' + tempImgList[d];
                console.log('Completed the following image at position: ' + d + '/' + tempImgList.length + ', ' + pubList.indexOf(pubmedID) + '/' + pubList.length);
                console.log(imgURL);

                var preExistingProgressStatus = document.getElementById('progress').innerHTML.split(',')[0];
                document.getElementById('progress').innerHTML = preExistingProgressStatus + ', Image position: ' + d + '/' + tempImgList.length;
                document.getElementById('titleOfPage').innerHTML = preExistingProgressStatus + ', Image position: ' + d + '/' + tempImgList.length;

                // This will download the image
                document.getElementById('imgLinkTest').href = imgURL;
                document.getElementById('imgLinkTest').innerHTML = imgURL;
                document.getElementById('imgLinkTest').click();

                // Stop process if this is true
                if (final === true) {
                    console.log(imgData);
                    document.getElementById('progress').innerHTML = 'Done';
                    document.getElementById('titleOfPage').innerHTML = 'Done';
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
    )
};