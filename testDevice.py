import cv2
import sys
import json
def read_in():
    lines = sys.stdin.readlines()
    # Since our input would only be having one line, parse our JSON data from that
    return json.loads(lines[0])

def main():
	#get our data as an array from read_in()
	lines = read_in()
	#print (lines)
	#print (type(lines))
	argument_list=[]
	for item in lines:
		argument_list.append(item)
	print (argument_list[0])
	#file = open("/home/ubuntu/jetson-device-client/NodeRest/Device_Information_temp", "r") 
	#for i, line in enumerate(file):
	#    if i == 3:
	url=argument_list[0]

	cam =cv2.VideoCapture(str(url))
	if cam.isOpened():
		print "0"
	else:
		print "1"

if __name__ == '__main__':
    main()

