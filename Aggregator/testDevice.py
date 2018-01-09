import cv2
import sys
import json

def read_in():
    lines = sys.stdin.readlines()
    return json.loads(lines[0])

def main():
	lines = read_in()
	argument_list=[]
	for item in lines:
		argument_list.append(item)
	#print (argument_list[0])
	url=argument_list[0]

	cam =cv2.VideoCapture(str(url))
	if cam.isOpened():
		print "0"
	else:
		print "1"

if __name__ == '__main__':
    main()

