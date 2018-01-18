import os
os.system("ps -ef |grep livestreaming.py | awk '{print $2}'| xargs kill -9")
print ("Stopped live streaming")
'''
os.system("kill -f livestream")
os.system("kill -f detectnet")
'''
