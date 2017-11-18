const fs = require('fs');
const path = require('path');
const request = require('superagent');
const parser = require('cheerio');
const targetDir = path.resolve(__dirname, 'result');
const targetUrl="https://ruby-china.org/topics";

const checkAndCreateDir = (dir) => {
	return new Promise((resolve, reject) => {
		fs.exists(dir, (exists) => {
			if (exists)return resolve();

			fs.mkdir(targetDir, (err) => {
				err ? reject({
					step: 1,
					message: 'failed to mkdir ' + targetDir + ', please create this dir manually'
				}) : resolve();
			});
		});
	})
}

const writeJSON = (title, content) => {
	return new Promise((resolve, reject) => {
		if (!title || !content) return reject({ step: 2, message: 'no title or content' })

		fs.writeFile(path.resolve(targetDir, title + '.json'), JSON.stringify(content,null,4), (err) => {
			err ? reject({ step: 2, message: 'failed to write file' }) : resolve();
		})
	})
}

const reqData= (url) =>{
	return new Promise((resolve,reject) => {
		if(!url)return reject('no target url')
		request
		.get(url)
		.end((err,res)=>{
			if(err)return reject('failed to request')
			resolve(res.text)
		})
	})
}

const html2Json = (htmlText) => {
	var $ = parser.load(htmlText);
	var resultList=[]
	$('.item-list>.topic').each((idx,el)=>{
		var $el=$(el);
		var authorUrl=$el.find('.avatar a').eq(0).attr('href');
		var contentHref=$el.find('.title a').eq(0).attr('href');
		var newItem={
			avatar:$el.find('.avatar img').eq(0).attr('src')||'',
			author_href:authorUrl?'https://ruby-china.org'+authorUrl:'',
			author:$el.find('.avatar a').eq(0).attr('title')||'',
			node:$el.find('.title .node').eq(0).html()||'',
			title:$el.find('.title a').eq(0).attr('title')||'',
			content_href:'https://ruby-china.org'+contentHref||'',
			reply:$el.find('.count a').eq(0).html(),
			latest_reply:$el.find('.timeago').eq(0).html(),
		}
		resultList.push(newItem)
	})
	return {
		page:$('.pagination .active a').html(),
		list:resultList,
		finish:$('.pagination .next').length>0?false:true
	}
}

const crawlerLoop = (url,idx) => {
	reqData(url+'?page='+idx)
	.then(resHtml=>{
		var result=html2Json(resHtml);
		writeJSON('topic.page'+result.page,result.list)
		
		if(!result.finish)crawlerLoop(url,idx+1)
	})
	.catch(err=>{
		console.log(err)
		crawlerLoop(url,idx)
	})
}

checkAndCreateDir(targetDir)
	.then(res => {
		crawlerLoop(targetUrl,1)
	})
	// .then(resHtml => {
	// 	writeJSON('topic.page1',parseHtml2Json(resHtml))
	// })
	.catch(err => {
		console.error(err)
	});
