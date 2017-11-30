import sys, json
import cv2
import threading
import datetime
import os
import requests

def read_in():
	lines = sys.stdin.readlines()
	# Since our input would only be having one line, parse our JSON data from that
	return json.loads(lines[0])

def main():
	#get our data as an array from read_in()
	lines = read_in()
	#print (lines)
	#print (type(lines))
	feature=int(lines[0])
	#print (type(feature))
	cam_number = int(lines[1])

	#print "Cam_number",cam_number

	with open('/home/ubuntu/surveillance/jetson-dl/jetson-device-client/NodeRest/AggregatorCode/jetson-device-client/Device_Information') as f:
	    content = f.readlines()
	#print content
	content = [x.strip() for x in content] 
	#print content
	d={}
	for x in content:
		if len(x) is not 0:
			key,value=x.split(" ")

			d.update({int(key): value})
	#print (d)	  
	if cam_number in d.keys():
		#print d[cam_number]
		#print d
		cam_url=d[cam_number]
		cam =cv2.VideoCapture(cam_url)
		if cam.isOpened():
			ret,img = cam.read();
			#File Name Format
			#print ("feature:::::::::::::::",feature)
			filename = "raw.jpg"
			'''if feature==1:
				filename = "Raw"+"_"+"Human"+"_"+str(cam_number)+".jpg"
			elif feature==2:
				filename = "Raw"+"_"+"Vehicle"+"_"+str(cam_number)+".jpg"
			'''
			cv2.imwrite(os.path.join("." ,filename), img)

			#server url
			try:
			    	url = "http://52.177.169.81:5005/api/Upload"
				files = {'file': open(filename, 'rb')}
				requests.post(url, files=files)
				cv2.waitKey(100)
			except requests.exceptions.Timeout:
		    		print "**SERVER ERROR:: Timeout in sending Raw Image"
			except requests.exceptions.TooManyRedirects:
		    		print "**SERVER ERROR:: Too many Redirects..!!"
			except requests.exceptions.RequestException as e:
		    		print e
		else:
			print "		***DVR ERROR!!! "
			url = "http://52.177.169.81:5005/api/errorHandling"
			requests.post(url, {'DVRError':'DVR not responding!!'})

# Start process
if __name__ == '__main__':
    main()

